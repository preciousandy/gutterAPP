<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Beneficiary;
use App\Models\Transaction;
use App\Models\User;
use App\Services\FeeService;
use App\Services\PalmPayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TransferController extends Controller
{
    protected const BANK_TRANSFER_FEE = 10.00;
    protected const GUTTER_TRANSFER_FEE = 0.00;

    protected const TIERS = [
        1 => ['daily_limit' => 50000,    'single_limit' => 20000],
        2 => ['daily_limit' => 5000000,  'single_limit' => 1000000],
        3 => ['daily_limit' => 25000000, 'single_limit' => 5000000],
    ];

    /**
     * List all supported commercial and fintech banks.
     *
     * Route: GET /api/v1/banks
     */
    public function banks(PalmPayService $palmPayService): JsonResponse
    {
        $banks = $palmPayService->getBanks();

        return response()->json([
            'data' => $banks,
        ]);
    }

    /**
     * Name enquiry: verify external bank account number and bank code.
     *
     * Route: POST /api/v1/transfers/verify-account
     */
    public function verifyAccount(Request $request, PalmPayService $palmPayService): JsonResponse
    {
        $validated = $request->validate([
            'bank_code' => ['required', 'string'],
            'account_number' => ['required', 'string', 'digits:10'],
        ]);

        $currentUser = $request->user();
        if ($currentUser) {
            $userCleanAccount = preg_replace('/\D/', '', (string) $currentUser->account_number);
            $queryCleanAccount = preg_replace('/\D/', '', $validated['account_number']);
            $userPhoneSuffix = substr(preg_replace('/\D/', '', (string) $currentUser->phone), -10);

            if ((!empty($userCleanAccount) && $userCleanAccount === $queryCleanAccount) ||
                (!empty($userPhoneSuffix) && strlen($userPhoneSuffix) === 10 && $userPhoneSuffix === $queryCleanAccount)
            ) {
                return response()->json([
                    'message' => 'You cannot transfer money to your own Gutter account.',
                    'errors' => [
                        'account_number' => ['You cannot transfer money to your own Gutter account.'],
                    ],
                ], 422);
            }
        }

        $lookup = $palmPayService->verifyBankAccount(
            $validated['bank_code'],
            $validated['account_number']
        );

        return response()->json([
            'data' => $lookup,
        ]);
    }

    /**
     * Instant lookup of another Gutter user by username, phone, email, or account number.
     *
     * Route: POST /api/v1/transfers/resolve-gutter-user
     */
    public function resolveGutterUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string', 'min:3'],
        ]);

        $sender = $request->user();
        $raw = trim($validated['identifier']);
        $identifier = ltrim($raw, '@');
        $phoneDigits = preg_replace('/\D/', '', $raw);

        // Check if identifier refers to the sender themself
        $senderPhone = preg_replace('/\D/', '', (string) $sender->phone);
        $isSelf = ($sender->email && strcasecmp($sender->email, $identifier) === 0)
            || ($sender->account_number && $sender->account_number === $identifier)
            || (!empty($phoneDigits) && strlen($phoneDigits) >= 9 && str_ends_with($senderPhone, $phoneDigits));

        if ($isSelf) {
            return response()->json([
                'message' => 'You cannot transfer money to your own Gutter account.',
            ], 422);
        }

        $recipient = User::where('id', '!=', $sender->id)
            ->where(function ($query) use ($identifier, $phoneDigits) {
                $query->where('email', $identifier)
                    ->orWhere('account_number', $identifier);

                if (strlen($identifier) >= 3) {
                    $query->orWhere('name', 'LIKE', "%{$identifier}%");
                }

                if (!empty($phoneDigits) && strlen($phoneDigits) >= 9) {
                    $query->orWhere('phone', 'LIKE', "%{$phoneDigits}%");
                }
            })
            ->first();

        if (!$recipient) {
            return response()->json([
                'message' => 'Gutter user not found. Check the username, account number, or phone number.',
            ], 404);
        }

        return response()->json([
            'data' => [
                'id' => $recipient->id,
                'name' => $recipient->name ?: ($recipient->first_name . ' ' . $recipient->last_name),
                'email' => $recipient->email,
                'phone' => $recipient->phone,
                'account_number' => $recipient->account_number,
                'bank_name' => 'Gutter',
                'is_gutter_user' => true,
            ],
        ]);
    }

    /**
     * Execute bank transfer or Gutter-to-Gutter transfer.
     *
     * Route: POST /api/v1/transfers
     */
    public function store(Request $request, PalmPayService $palmPayService): JsonResponse
    {
        $user = $request->user();

        // 0. Concurrency Lock: Prevent simultaneous double-click / parallel transfer race conditions
        $transferLock = Cache::lock('user_transfer_' . $user->id, 15);
        if (!$transferLock->get()) {
            return response()->json([
                'message' => 'A transfer is already being processed on your account. Please wait a moment.',
            ], 429);
        }

        try {
            // 1. Account status checks
            if (!$user->isActive() || $user->isFrozen()) {
                return response()->json([
                    'message' => 'Your account is restricted from making transfers. Please contact support.',
                ], 403);
            }

            // 2. KYC requirement check
            if ($user->kyc_status !== 'verified') {
                return response()->json([
                    'message' => 'KYC identity verification is required to make transfers. Please complete verification in Settings.',
                    'error_code' => 'KYC_REQUIRED',
                ], 403);
            }

            // 3. Validate base input
            $validated = $request->validate([
                'type' => ['nullable', 'string', 'in:bank,gutter'],
                'amount' => ['required', 'numeric', 'min:50'],
                'pin' => ['required', 'string', 'digits:4'],
                'description' => ['nullable', 'string', 'max:255'],
                // Bank transfer fields
                'bank_code' => ['required_if:type,bank', 'nullable', 'string'],
                'account_number' => ['required_if:type,bank', 'nullable', 'string', 'digits:10'],
                // Gutter-to-Gutter fields
                'recipient_id' => ['nullable', 'integer'],
                'recipient_identifier' => ['required_if:type,gutter', 'nullable', 'string'],
            ]);

            $type = $validated['type'] ?? 'bank';
            $amount = (float) $validated['amount'];
            $serviceKey = $type === 'bank' ? 'bank_transfer' : 'gutter_to_gutter';

            if (!FeeService::isEnabled($serviceKey)) {
                return response()->json([
                    'message' => ($type === 'bank' ? 'Bank transfers' : 'Gutter-to-Gutter transfers') . ' are temporarily paused for system maintenance.',
                ], 503);
            }

            $fee = FeeService::calculateFee($serviceKey, $amount);
            $totalDebit = $amount + $fee;

            // 3.5. Prevent self-transfers before checking PIN or balance
            if ($type === 'bank' && !empty($validated['account_number'])) {
                $userCleanAccount = preg_replace('/\D/', '', (string) $user->account_number);
                $targetCleanAccount = preg_replace('/\D/', '', $validated['account_number']);
                $userPhoneSuffix = substr(preg_replace('/\D/', '', (string) $user->phone), -10);

                if ((!empty($userCleanAccount) && $userCleanAccount === $targetCleanAccount) ||
                    (!empty($userPhoneSuffix) && strlen($userPhoneSuffix) === 10 && $userPhoneSuffix === $targetCleanAccount)
                ) {
                    return response()->json([
                        'message' => 'You cannot transfer money to your own Gutter account.',
                        'errors' => [
                            'account_number' => ['You cannot transfer money to your own Gutter account.'],
                        ],
                    ], 422);
                }
            } elseif ($type === 'gutter') {
                $raw = trim($validated['recipient_identifier'] ?? '');
                $cleanIdent = ltrim($raw, '@');
                $phoneDigits = preg_replace('/\D/', '', $raw);
                $userPhone = preg_replace('/\D/', '', (string) $user->phone);

                if (($validated['recipient_id'] ?? null) == $user->id ||
                    ($user->email && strcasecmp($user->email, $cleanIdent) === 0) ||
                    ($user->account_number && $user->account_number === $cleanIdent) ||
                    (!empty($phoneDigits) && strlen($phoneDigits) >= 9 && str_ends_with($userPhone, $phoneDigits))
                ) {
                    return response()->json([
                        'message' => 'You cannot transfer money to your own Gutter account.',
                        'errors' => [
                            'recipient_identifier' => ['You cannot transfer money to your own Gutter account.'],
                        ],
                    ], 422);
                }
            }

            // 4. Verify Transaction PIN
            if (!$user->has_pin || empty($user->pin) || !Hash::check($validated['pin'], $user->pin)) {
                return response()->json([
                    'message' => 'Incorrect transaction PIN. Please try again.',
                ], 422);
            }

            // 5. Verify Tier Limits
            $tier = (int) ($user->tier ?? 1);
            if ($tier < 1 || $tier > 3) {
                $tier = 1;
            }
            $tierLimits = self::TIERS[$tier] ?? self::TIERS[1];

            if ($amount > $tierLimits['single_limit']) {
                return response()->json([
                    'message' => "Amount exceeds your Tier {$tier} single transfer limit of ₦" . number_format($tierLimits['single_limit'], 2),
                ], 422);
            }

            $todaySpent = (float) $user->transactions()
                ->where('direction', 'out')
                ->whereIn('status', ['successful', 'completed', 'pending'])
                ->whereDate('created_at', now()->toDateString())
                ->sum('amount');

            if (($todaySpent + $amount) > $tierLimits['daily_limit']) {
                $remaining = max(0, $tierLimits['daily_limit'] - $todaySpent);
                return response()->json([
                    'message' => "Transfer exceeds your remaining daily limit of ₦" . number_format($remaining, 2) . " for Tier {$tier}.",
                ], 422);
            }

            // 6. Verify Initial Wallet Balance
            if ((float) $user->wallet_balance < $totalDebit) {
                return response()->json([
                    'message' => 'Insufficient funds in your Naira wallet to complete this transfer.',
                ], 422);
            }

            // 7. Route Execution
            if ($type === 'gutter') {
                return $this->executeGutterTransfer($user, $amount, $fee, $validated);
            }

            return $this->executeBankTransfer($user, $amount, $fee, $validated, $palmPayService);
        } finally {
            optional($transferLock)->release();
        }
    }

    /**
     * Process Gutter-to-Gutter instant transfer (₦0 Fee, atomic balance swap).
     * Uses deterministic row lock ordering to eliminate database deadlocks.
     */
    protected function executeGutterTransfer(
        User $sender,
        float $amount,
        float $fee,
        array $validated
    ): JsonResponse {
        $identifier = trim($validated['recipient_identifier'] ?? '');
        $recipientId = $validated['recipient_id'] ?? null;

        $recipientQuery = User::where('id', '!=', $sender->id);
        if ($recipientId) {
            $recipientQuery->where('id', $recipientId);
        } else {
            $cleanIdent = ltrim($identifier, '@');
            $phoneDigits = preg_replace('/\D/', '', $identifier);
            $recipientQuery->where(function ($q) use ($cleanIdent, $phoneDigits) {
                $q->where('email', $cleanIdent)
                    ->orWhere('account_number', $cleanIdent);
                if (strlen($cleanIdent) >= 3) {
                    $q->orWhere('name', 'LIKE', "%{$cleanIdent}%");
                }
                if (!empty($phoneDigits) && strlen($phoneDigits) >= 9) {
                    $q->orWhere('phone', 'LIKE', "%{$phoneDigits}%");
                }
            });
        }

        $recipient = $recipientQuery->first();
        if (!$recipient) {
            return response()->json([
                'message' => 'Recipient not found. Please verify the Gutter username or account number.',
            ], 404);
        }

        $recipientName = $recipient->name ?: ($recipient->first_name . ' ' . $recipient->last_name);
        $senderName = $sender->name ?: ($sender->first_name . ' ' . $sender->last_name);
        $reference = 'GT_P2P_' . strtoupper(Str::random(12));
        $narration = $validated['description'] ?? 'Gutter-to-Gutter Transfer';
        $totalDebit = $amount + $fee;

        // Sort user IDs in ascending order to prevent deadlocks across concurrent bidirectional transfers
        $firstId = min($sender->id, $recipient->id);
        $secondId = max($sender->id, $recipient->id);

        try {
            $senderTx = DB::transaction(function () use (
                $sender,
                $recipient,
                $firstId,
                $secondId,
                $amount,
                $fee,
                $totalDebit,
                $reference,
                $narration,
                $recipientName,
                $senderName
            ) {
                // Pessimistic locks in deterministic order
                $firstUser = User::where('id', $firstId)->lockForUpdate()->first();
                $secondUser = User::where('id', $secondId)->lockForUpdate()->first();

                $lockedSender = ($sender->id === $firstId) ? $firstUser : $secondUser;
                $lockedRecipient = ($recipient->id === $firstId) ? $firstUser : $secondUser;

                if (!$lockedSender || (float) $lockedSender->wallet_balance < $totalDebit) {
                    throw new \DomainException('Insufficient funds in your Naira wallet to complete this transfer.');
                }

                // Deduct from sender
                $lockedSender->decrement('wallet_balance', $totalDebit);

                // Credit recipient
                $lockedRecipient->increment('wallet_balance', $amount);

                // Outgoing transaction for sender
                $outTx = $lockedSender->transactions()->create([
                    'reference' => $reference,
                    'type' => 'transfer',
                    'direction' => 'out',
                    'title' => 'Gutter Transfer',
                    'subtitle' => 'To ' . $recipientName,
                    'amount' => $amount,
                    'currency' => 'NGN',
                    'status' => 'successful',
                    'fee' => $fee,
                    'description' => $narration,
                    'counterparty' => $recipientName,
                    'counterparty_bank' => 'Gutter',
                ]);

                // Incoming transaction for recipient
                $lockedRecipient->transactions()->create([
                    'reference' => $reference . '_IN',
                    'type' => 'transfer',
                    'direction' => 'in',
                    'title' => 'Gutter Transfer',
                    'subtitle' => 'From ' . $senderName,
                    'amount' => $amount,
                    'currency' => 'NGN',
                    'status' => 'successful',
                    'fee' => 0.00,
                    'description' => $narration,
                    'counterparty' => $senderName,
                    'counterparty_bank' => 'Gutter',
                ]);

                // Auto-save recipient as beneficiary for sender
                Beneficiary::firstOrCreate([
                    'user_id' => $lockedSender->id,
                    'account_number' => $lockedRecipient->account_number ?: (string) $lockedRecipient->id,
                    'bank_name' => 'Gutter',
                ], [
                    'name' => $recipientName,
                    'bank_code' => 'GUTTER',
                ]);

                return $outTx;
            });
        } catch (\DomainException $de) {
            return response()->json([
                'message' => $de->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Gutter-to-Gutter transfer successful (₦0 Fee).',
            'data' => $senderTx,
        ]);
    }

    /**
     * Process outward bank transfer via PalmPay gateway.
     * Protected by pessimistic balance lock, idempotency, and atomic auto-refunds.
     */
    protected function executeBankTransfer(
        User $user,
        float $amount,
        float $fee,
        array $validated,
        PalmPayService $palmPayService
    ): JsonResponse {
        $bankCode = $validated['bank_code'];
        $accountNumber = $validated['account_number'];
        $narration = $validated['description'] ?? 'Bank Transfer';

        $userCleanAccount = preg_replace('/\D/', '', (string) $user->account_number);
        $targetCleanAccount = preg_replace('/\D/', '', $accountNumber);
        $userPhoneSuffix = substr(preg_replace('/\D/', '', (string) $user->phone), -10);

        if ((!empty($userCleanAccount) && $userCleanAccount === $targetCleanAccount) ||
            (!empty($userPhoneSuffix) && strlen($userPhoneSuffix) === 10 && $userPhoneSuffix === $targetCleanAccount)
        ) {
            return response()->json([
                'message' => 'You cannot transfer money to your own Gutter account.',
                'errors' => [
                    'account_number' => ['You cannot transfer money to your own Gutter account.'],
                ],
            ], 422);
        }

        // 1. Resolve account name with PalmPay
        $lookup = $palmPayService->verifyBankAccount($bankCode, $accountNumber);
        $accountName = $lookup['account_name'];

        // Determine destination bank name
        $banks = collect($palmPayService->getBanks())->keyBy('code');
        $bankName = $banks->get($bankCode)['name'] ?? 'Commercial Bank';

        $reference = 'TX_OUT_' . strtoupper(Str::random(12));
        $totalDebit = $amount + $fee;

        // 2. Perform atomic balance deduction & record pending transaction under pessimistic lock
        try {
            $transaction = DB::transaction(function () use (
                $user,
                $amount,
                $fee,
                $totalDebit,
                $reference,
                $narration,
                $accountName,
                $bankName,
                $bankCode,
                $accountNumber
            ) {
                $lockedUser = User::where('id', $user->id)->lockForUpdate()->first();
                if (!$lockedUser) {
                    throw new \DomainException('User account not found.');
                }

                if ((float) $lockedUser->wallet_balance < $totalDebit) {
                    throw new \DomainException('Insufficient funds in your Naira wallet to complete this transfer.');
                }

                $lockedUser->decrement('wallet_balance', $totalDebit);

                $tx = $lockedUser->transactions()->create([
                    'reference' => $reference,
                    'type' => 'transfer',
                    'direction' => 'out',
                    'title' => 'Bank Transfer',
                    'subtitle' => 'To ' . $accountName,
                    'amount' => $amount,
                    'currency' => 'NGN',
                    'status' => 'pending',
                    'fee' => $fee,
                    'description' => $narration,
                    'counterparty' => $accountName,
                    'counterparty_bank' => $bankName,
                ]);

                // Save beneficiary for fast future transfers
                Beneficiary::firstOrCreate([
                    'user_id' => $lockedUser->id,
                    'account_number' => $accountNumber,
                    'bank_code' => $bankCode,
                ], [
                    'name' => $accountName,
                    'bank_name' => $bankName,
                ]);

                return $tx;
            });
        } catch (\DomainException $de) {
            return response()->json([
                'message' => $de->getMessage(),
            ], 422);
        }

        // 3. Dispatch to PalmPay Open Gateway
        try {
            $payout = $palmPayService->transferToBank(
                $user,
                $bankCode,
                $accountNumber,
                $accountName,
                $amount,
                $narration,
                $reference
            );

            $descriptionWithSession = !empty($payout['session_id'])
                ? ($narration . ' | NIBSS: ' . $payout['session_id'])
                : $narration;

            $transaction->update([
                'status' => $payout['status'],
                'description' => $descriptionWithSession,
            ]);

            return response()->json([
                'message' => $payout['message'],
                'data' => $transaction->fresh(),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('PalmPay payout execution error: ' . $e->getMessage());

            // Auto-refund user immediately on gateway failure under lock
            DB::transaction(function () use ($user, $totalDebit, $transaction, $e) {
                $lockedUser = User::where('id', $user->id)->lockForUpdate()->first();
                if ($lockedUser) {
                    $lockedUser->increment('wallet_balance', $totalDebit);
                }
                $transaction->update([
                    'status' => 'failed',
                    'description' => $transaction->description . ' (Failed: ' . $e->getMessage() . ')',
                ]);
            });

            return response()->json([
                'message' => 'Transfer could not be processed: ' . $e->getMessage(),
            ], 422);
        }
    }
}
