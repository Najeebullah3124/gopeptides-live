/** Manual bank-transfer payout details shown after checkout. */
export type BankTransferDetails = {
  accountHolder: string;
  iban: string;
  bic: string;
  reference: string;
};

export function getBankTransferDetails(orderNumber: string): BankTransferDetails {
  return {
    accountHolder: process.env.BANK_ACCOUNT_HOLDER || 'Dubiotech',
    iban: process.env.BANK_IBAN || 'NL63REVO5801164286',
    bic: process.env.BANK_BIC || 'REVONL22',
    reference: orderNumber,
  };
}

export function isBankTransferMethod(method?: string): boolean {
  return method === 'bank_transfer';
}
