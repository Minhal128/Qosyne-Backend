const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getTaxSettings = async (req, res) => {
  try {
    const existing = await prisma.taxSettings.findFirst();
    res.status(200).json({ message: 'Fetched', data: existing || null });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateOrCreateTaxSettings = async (req, res) => {
  const { revenueStreamCost, qosneWalletFee } = req.body;
  try {
    const existing = await prisma.taxSettings.findFirst();
    let result;
    if (existing) {
      result = await prisma.taxSettings.update({
        where: { id: existing.id },
        data: { revenueStreamCost, qosneWalletFee },
      });
    } else {
      result = await prisma.taxSettings.create({
        data: { revenueStreamCost, qosneWalletFee },
      });
    }
    res.status(200).json({ message: 'Saved', data: result });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
