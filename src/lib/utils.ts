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

export const formatStock = (total: number, packagingUnit?: string, unitsPerPackage?: number, baseUnit: string = 'Piece') => {
    if (!packagingUnit || !unitsPerPackage || unitsPerPackage <= 1) {
        return `${total} ${baseUnit}${total !== 1 ? 's' : ''}`;
    }

    const packages = Math.floor(total / unitsPerPackage);
    const remnants = total % unitsPerPackage;

    if (packages === 0) {
        return `${total} ${baseUnit}${total !== 1 ? 's' : ''}`;
    }

    return `${total} ${baseUnit}${total !== 1 ? 's' : ''} (${packages} ${packagingUnit}${packages !== 1 ? 's' : ''}${remnants > 0 ? ` + ${remnants} ${baseUnit}${remnants !== 1 ? 's' : ''}` : ''})`;
};
