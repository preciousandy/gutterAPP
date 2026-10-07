import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Transaction, User, Wallet } from '@/types';
import { formatDateTime, formatNaira } from '@/utils/format';

export interface StatementParams {
  user: User | null;
  wallet: Wallet | null;
  transactions: Transaction[];
  periodLabel: string;
  startDate: string;
  endDate: string;
}

export function generateStatementHtml({
  user,
  wallet,
  transactions,
  periodLabel,
  startDate,
  endDate,
}: StatementParams): string {
  const accountName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
    : 'Valued Customer';
  const accountNumber = wallet?.account_number ?? '0000000000';
  const bankName = wallet?.bank_name ?? 'Wema Bank';
  const closingBalance = wallet?.balance ?? 0;

  // Calculate totals
  let totalInflow = 0;
  let totalOutflow = 0;

  for (const t of transactions) {
    if (t.status !== 'failed') {
      if (t.direction === 'in') {
        totalInflow += Math.abs(t.amount);
      } else {
        totalOutflow += Math.abs(t.amount);
      }
    }
  }

  const netMovement = totalInflow - totalOutflow;

  const tableRows = transactions.length === 0
    ? `
      <tr>
        <td colspan="6" style="padding: 24px; text-align: center; color: #6B7280; font-style: italic;">
          No transactions recorded during this period.
        </td>
      </tr>
    `
    : transactions
        .map((t, idx) => {
          const isCredit = t.direction === 'in';
          const debitStr = !isCredit ? formatNaira(Math.abs(t.amount), 2) : '-';
          const creditStr = isCredit ? formatNaira(Math.abs(t.amount), 2) : '-';

          const narration = [
            t.title,
            t.counterparty ? `To/From: ${t.counterparty}` : null,
            t.counterparty_bank ? `(${t.counterparty_bank})` : null,
            t.description ? `- ${t.description}` : null,
          ]
            .filter(Boolean)
            .join(' ');

          return `
          <tr style="border-bottom: 1px solid #E5E7EB; ${idx % 2 === 1 ? 'background-color: #F9FAFB;' : ''}">
            <td style="padding: 10px 12px; font-size: 11px; color: #374151; white-space: nowrap;">
              ${formatDateTime(t.created_at)}
            </td>
            <td style="padding: 10px 12px; font-size: 11px; font-family: monospace; color: #111827; font-weight: 600;">
              ${t.reference}
            </td>
            <td style="padding: 10px 12px; font-size: 11px; color: #1F2937; line-height: 1.4;">
              ${narration}
            </td>
            <td style="padding: 10px 12px; font-size: 11px; text-align: right; color: ${debitStr !== '-' ? '#DC2626' : '#9CA3AF'}; font-weight: 600; white-space: nowrap;">
              ${debitStr}
            </td>
            <td style="padding: 10px 12px; font-size: 11px; text-align: right; color: ${creditStr !== '-' ? '#059669' : '#9CA3AF'}; font-weight: 700; white-space: nowrap;">
              ${creditStr}
            </td>
            <td style="padding: 10px 12px; font-size: 11px; text-align: center; text-transform: capitalize; color: ${
              t.status === 'successful' ? '#059669' : t.status === 'pending' ? '#D97706' : '#DC2626'
            }; font-weight: 600;">
              ${t.status}
            </td>
          </tr>
        `;
        })
        .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Account Statement - ${accountNumber}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background-color: #FFFFFF;
      color: #111827;
      padding: 32px;
      font-size: 12px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000B26;
      padding-bottom: 18px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: #000B26;
      color: #00D287;
      font-size: 22px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 38px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      color: #000B26;
      letter-spacing: -0.5px;
    }
    .sub-brand {
      font-size: 10px;
      color: #6B7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .statement-tag {
      text-align: right;
    }
    .statement-tag h2 {
      font-size: 18px;
      font-weight: 800;
      color: #000B26;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .statement-tag p {
      font-size: 11px;
      color: #6B7280;
      margin-top: 2px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 20px;
      margin-top: 20px;
    }
    .box {
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 14px 18px;
      background-color: #F9FAFB;
    }
    .box-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #6B7280;
      margin-bottom: 8px;
      border-bottom: 1px solid #E5E7EB;
      padding-bottom: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .info-label {
      color: #6B7280;
      font-weight: 500;
    }
    .info-val {
      font-weight: 700;
      color: #111827;
      text-align: right;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    .metric-card {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px;
      text-align: center;
    }
    .metric-title {
      font-size: 10px;
      text-transform: uppercase;
      color: #64748B;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .metric-val {
      font-size: 14px;
      font-weight: 800;
      margin-top: 4px;
      color: #000B26;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      overflow: hidden;
    }
    th {
      background-color: #000B26;
      color: #FFFFFF;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 10px 12px;
    }
    .footer {
      margin-top: 36px;
      border-top: 1px solid #E5E7EB;
      padding-top: 16px;
      font-size: 10.5px;
      color: #9CA3AF;
      line-height: 1.6;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="badge">G</div>
      <div>
        <div class="brand-title">GUTTER</div>
        <div class="sub-brand">Digital Banking & Financial Services</div>
      </div>
    </div>
    <div class="statement-tag">
      <h2>Account Statement</h2>
      <p>Period: ${periodLabel}</p>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="box-title">Account Holder Details</div>
      <div class="info-row">
        <span class="info-label">Account Name:</span>
        <span class="info-val">${accountName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Account Number:</span>
        <span class="info-val">${accountNumber}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Bank Partner:</span>
        <span class="info-val">${bankName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email Address:</span>
        <span class="info-val">${user?.email ?? '-'}</span>
      </div>
    </div>

    <div class="box">
      <div class="box-title">Statement Summary</div>
      <div class="info-row">
        <span class="info-label">Generated Date:</span>
        <span class="info-val">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Currency:</span>
        <span class="info-val">NGN (₦)</span>
      </div>
      <div class="info-row">
        <span class="info-label">From:</span>
        <span class="info-val">${startDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">To:</span>
        <span class="info-val">${endDate}</span>
      </div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="metric-card">
      <div class="metric-title">Total Credits (Inflow)</div>
      <div class="metric-val" style="color: #059669;">+${formatNaira(totalInflow, 2)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-title">Total Debits (Outflow)</div>
      <div class="metric-val" style="color: #DC2626;">-${formatNaira(totalOutflow, 2)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-title">Net Cashflow</div>
      <div class="metric-val" style="color: ${netMovement >= 0 ? '#059669' : '#DC2626'};">
        ${netMovement >= 0 ? '+' : ''}${formatNaira(netMovement, 2)}
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-title">Closing Balance</div>
      <div class="metric-val" style="color: #000B26;">${formatNaira(closingBalance, 2)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 16%;">Date & Time</th>
        <th style="width: 18%;">Reference</th>
        <th style="width: 32%;">Narration / Description</th>
        <th style="width: 12%; text-align: right;">Debit (₦)</th>
        <th style="width: 12%; text-align: right;">Credit (₦)</th>
        <th style="width: 10%; text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="footer">
    <p><strong>Official Electronic Bank Statement</strong></p>
    <p>This statement is generated automatically by Gutter Technologies Ltd. Reference questions can be directed to support@gutter.africa.</p>
    <p style="margin-top: 4px;">Gutter Digital Banking · Registered in Nigeria · Powered by licensed banking partners.</p>
  </div>
</body>
</html>
  `;
}

export async function downloadStatementPdf(params: StatementParams): Promise<void> {
  const html = generateStatementHtml(params);
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `Gutter Statement - ${params.wallet?.account_number ?? 'Account'}`,
    });
  } else {
    await Print.printAsync({ html });
  }
}
