import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Transaction } from '@/types';
import { formatDateTime, formatNaira, formatUsd } from '@/utils/format';

export function generateReceiptHtml(transaction: Transaction): string {
  const isInflow = transaction.direction === 'in';
  const amountStr =
    transaction.currency === 'USD'
      ? formatUsd(Math.abs(transaction.amount))
      : formatNaira(Math.abs(transaction.amount), 2);

  const statusLabel =
    transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1).toLowerCase();

  const statusColor =
    transaction.status === 'successful'
      ? '#059669'
      : transaction.status === 'pending'
        ? '#D97706'
        : '#DC2626';

  const statusBg =
    transaction.status === 'successful'
      ? '#ECFDF5'
      : transaction.status === 'pending'
        ? '#FEF3C7'
        : '#FEE2E2';

  const rawToken =
    transaction.token
    || transaction.subtitle?.match(/Token:\s*([0-9\-\s]{12,30})/i)?.[1]?.trim()
    || transaction.description?.match(/Token:\s*([0-9\-\s]{12,30})/i)?.[1]?.trim();

  const formattedToken = rawToken
    ? (rawToken.replace(/\D/g, '').length === 20
        ? rawToken.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 - ')
        : rawToken)
    : null;

  const isElectricity = Boolean(
    transaction.token
    || formattedToken
    || (transaction.title && /electric/i.test(transaction.title))
    || (transaction.subtitle && /meter/i.test(transaction.subtitle))
    || (transaction.counterparty && /electric|meter|disco/i.test(transaction.counterparty))
  );

  const isBetting = Boolean(
    !isElectricity && (
      (transaction.reference && transaction.reference.startsWith('BET_'))
      || (transaction.title && /bet|sport|top-up|biller/i.test(transaction.title))
      || (transaction.counterparty_bank && /sporty|bet9ja|1xbet|betway|betking|bangbet|merrybet|nairabet|msport|betting/i.test(transaction.counterparty_bank))
      || (transaction.counterparty && /sporty|bet9ja|1xbet|betway|betking|bangbet|merrybet|nairabet|msport|betting/i.test(transaction.counterparty))
      || (transaction.description && /betting/i.test(transaction.description))
    )
  );

  const isCable = Boolean(
    !isElectricity && !isBetting && (
      (transaction.reference && transaction.reference.startsWith('CBL_'))
      || (transaction.title && /cable|dstv|gotv|startimes|showmax/i.test(transaction.title))
      || (transaction.counterparty_bank && /dstv|gotv|startimes|showmax/i.test(transaction.counterparty_bank))
      || (transaction.counterparty && /dstv|gotv|startimes|showmax/i.test(transaction.counterparty))
      || (transaction.description && /dstv|gotv|startimes|showmax|cable tv/i.test(transaction.description))
    )
  );

  const isAirtime = transaction.type === 'airtime' && !isElectricity && !isBetting && !isCable;

  const bookmakerName = isBetting
    ? (transaction.counterparty_bank && !['BIGISUB', 'VTPASS'].includes(transaction.counterparty_bank.toUpperCase())
        ? transaction.counterparty_bank
        : transaction.counterparty?.match(/^([a-zA-Z0-9\s]+)\s*[·-]/)?.[1]?.trim()
        || transaction.title?.replace(/\s*Top-up/i, '').trim()
        || 'Betting Platform')
    : '';

  const cableProviderName = isCable
    ? (transaction.counterparty_bank && !['BIGISUB', 'VTPASS'].includes(transaction.counterparty_bank.toUpperCase())
        ? transaction.counterparty_bank
        : transaction.counterparty?.match(/^([a-zA-Z0-9\s]+)\s*[·-]/)?.[1]?.trim()
        || transaction.title?.match(/(DStv|GOtv|StarTimes|Showmax)/i)?.[1]
        || 'Cable TV Provider')
    : '';

  const networkName =
    isAirtime
      ? (transaction.counterparty?.match(/^(MTN|AIRTEL|GLO|9MOBILE|ETISALAT)/i)?.[1]?.toUpperCase()
        || (transaction.counterparty_bank && !['BIGISUB', 'VTPASS'].includes(transaction.counterparty_bank.toUpperCase()) ? transaction.counterparty_bank : null)
        || transaction.title?.match(/^(MTN|AIRTEL|GLO|9MOBILE|ETISALAT)/i)?.[1]?.toUpperCase()
        || `${transaction.description || ''}`.match(/\b(MTN|Airtel|Glo|9mobile|Etisalat)\b/i)?.[1]?.toUpperCase()
        || 'MTN')
      : (transaction.counterparty_bank || '');

  const cleanCounterparty = (isElectricity || isBetting || isCable) && transaction.counterparty
    ? transaction.counterparty.replace(/^[a-zA-Z0-9_\-\s]+\s*[·-]\s*/, '').trim()
    : isAirtime && transaction.counterparty
      ? transaction.counterparty.replace(/^[a-zA-Z0-9]+\s*[·-]\s*/, '').trim()
      : transaction.counterparty;

  const rows: { label: string; value: string }[] = [
    ...(formattedToken
      ? [
          {
            label: 'Prepaid Meter Token',
            value: formattedToken,
          },
        ]
      : []),
    ...(transaction.units
      ? [
          {
            label: 'Units Credited',
            value: `${transaction.units} kWh`,
          },
        ]
      : []),
    ...(transaction.counterparty
      ? [
          {
            label: isElectricity
              ? 'Meter Number'
              : isBetting
                ? 'Account / User ID'
                : isCable
                  ? 'Smartcard / IUC Number'
                  : isAirtime
                    ? 'Recipient / Phone'
                    : isInflow
                      ? 'Sender Name'
                      : 'Recipient Name',
            value: String(cleanCounterparty || transaction.counterparty).toUpperCase(),
          },
        ]
      : []),
    ...(isBetting
      ? [
          {
            label: 'Bookmaker Platform',
            value: String(bookmakerName),
          },
        ]
      : isCable
        ? [
            {
              label: 'Cable TV Provider',
              value: String(cableProviderName),
            },
          ]
      : isElectricity
        ? [
            {
              label: 'Distribution Co. (DISCO)',
              value: String(transaction.counterparty_bank || 'Electricity DISCO'),
            },
          ]
        : transaction.counterparty_bank || (isAirtime && networkName)
          ? [
              {
                label: isAirtime
                  ? 'Network Provider'
                  : isInflow
                    ? 'Sender Bank'
                    : 'Beneficiary Bank',
                value: String(isAirtime ? networkName : transaction.counterparty_bank),
              },
            ]
          : []),
    {
      label: isInflow ? 'Credited To' : 'Debited From',
      value: transaction.currency === 'USD' ? 'USD Wallet' : 'Naira Wallet',
    },
    {
      label: 'Transaction Type',
      value: isElectricity
        ? 'Electricity Recharge'
        : isBetting
          ? 'Betting Wallet Top-up'
          : isCable
            ? 'Cable TV Subscription'
            : String(transaction.title || 'Transaction'),
    },
    ...(transaction.fee != null
      ? [
          {
            label: 'Transaction Fee',
            value: transaction.fee === 0 ? 'Free (₦0.00)' : formatNaira(transaction.fee, 2),
          },
        ]
      : []),
    ...(transaction.description
      ? [
          {
            label: 'Description / Narration',
            value: String(transaction.description)
              .replace(/\s*(via|from|through)\s+(VTpass|bigisub|bigi)\.?/gi, '.')
              .replace(/\s*\.\s*$/, '.')
              .trim(),
          },
        ]
      : []),
    {
      label: 'Date & Time',
      value: formatDateTime(transaction.created_at),
    },
    {
      label: 'Transaction Reference',
      value: String(transaction.reference || ''),
    },
    {
      label: 'Status',
      value: statusLabel,
    },
  ];

  const rowsHtml = rows
    .map(
      (r, i) => `
      <tr style="border-bottom: 1px solid #E5E7EB; ${i % 2 === 1 ? 'background-color: #FAFAFA;' : ''}">
        <td style="padding: 12px 16px; font-size: 13px; color: #6B7280; font-weight: 500;">${r.label}</td>
        <td style="padding: 12px 16px; font-size: 13px; color: #111827; font-weight: 700; text-align: right; word-break: break-all;">${r.value}</td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${transaction.reference}</title>
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
      padding: 36px 32px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000B26;
      padding-bottom: 20px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-badge {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      background: linear-gradient(135deg, #00D287 0%, #00B372 100%);
      color: #000B26;
      font-size: 20px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 36px;
    }
    .brand-name {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #000B26;
    }
    .receipt-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6B7280;
      text-align: right;
    }
    .banner {
      margin-top: 28px;
      text-align: center;
      padding: 24px 20px;
      background-color: #F8FAFC;
      border-radius: 16px;
      border: 1px solid #E2E8F0;
    }
    .amount {
      font-size: 32px;
      font-weight: 800;
      color: #000B26;
      margin-top: 8px;
      letter-spacing: -0.5px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${statusColor};
      background-color: ${statusBg};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #E5E7EB;
    }
    .footer {
      margin-top: 36px;
      padding-top: 20px;
      border-top: 1px dashed #D1D5DB;
      text-align: center;
      color: #9CA3AF;
      font-size: 11px;
      line-height: 1.6;
    }
    .disclaimer {
      font-weight: 600;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      <div class="logo-badge">G</div>
      <div class="brand-name">GUTTER</div>
    </div>
    <div class="receipt-title">
      Transaction Receipt
    </div>
  </div>

  <div class="banner">
    <div class="status-badge">${statusLabel}</div>
    <div class="amount">${amountStr}</div>
    <div style="font-size: 13px; color: #64748B; margin-top: 6px; font-weight: 500;">
      ${transaction.title}
    </div>
  </div>

  <table>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <p class="disclaimer">This is an authentic electronic receipt generated by Gutter App.</p>
    <p>For support or verification, contact support@gutter.africa with reference <strong>${transaction.reference}</strong>.</p>
    <p style="margin-top: 6px;">© ${new Date().getFullYear()} Gutter Technologies Ltd. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

export async function downloadReceiptPdf(transaction: Transaction): Promise<void> {
  const html = generateReceiptHtml(transaction);
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `Receipt - ${transaction.reference}`,
    });
  } else {
    // Web or fallback
    await Print.printAsync({ html });
  }
}
