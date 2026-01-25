export const VAT_RATE = 0.075; // 7.5%

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
    }).format(amount);
};

export const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};
