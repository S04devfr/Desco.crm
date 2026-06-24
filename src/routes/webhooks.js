const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// Xavfsizlik Middleware: Tokenni tekshirish
const verifyWebhookToken = (req, res, next) => {
  const token = req.header('X-CRM-Webhook-Token');
  const secret = process.env.WEBHOOK_SECRET_TOKEN || 'desco-crm-secret-2026';

  if (!token || token !== secret) {
    return res.status(403).json({ error: 'Forbidden: Invalid or missing Webhook Token' });
  }
  next();
};

// POST /api/webhooks/lead
router.post('/lead', verifyWebhookToken, async (req, res, next) => {
  try {
    const { name, phone, region, product, forWhom, campaign, source } = req.body;

    // Majburiy maydonlarni tekshirish
    if (!name || !phone) {
      return res.status(400).json({ error: 'Bad Request: "name" and "phone" are required fields.' });
    }

    // Telefon raqami bo'yicha mijozni qidiramiz
    let client = await prisma.client.findFirst({
      where: { phone: phone }
    });

    // Mijoz topilmasa, yangisini yaratamiz
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: name,
          phone: phone,
          companyAddress: region || null,
          notes: `Manba: ${source || 'Tashqi Webhook'}`
        }
      });
    }

    // Asosiy Voronka (isDefault = true) va uning 1-bosqichini topamiz
    const pipeline = await prisma.pipeline.findFirst({
      where: { isDefault: true },
      include: { stages: { orderBy: { order: 'asc' }, take: 1 } }
    });

    let targetStageId = null;
    let targetPipelineId = null;

    if (pipeline && pipeline.stages.length > 0) {
      targetPipelineId = pipeline.id;
      targetStageId = pipeline.stages[0].id;
    } else {
      // Agar Asosiy Voronka topilmasa, istalgan birinchi voronkani olamiz
      const fallbackPipeline = await prisma.pipeline.findFirst({
        include: { stages: { orderBy: { order: 'asc' }, take: 1 } }
      });
      if (fallbackPipeline && fallbackPipeline.stages.length > 0) {
        targetPipelineId = fallbackPipeline.id;
        targetStageId = fallbackPipeline.stages[0].id;
      }
    }

    // Izohni chiroyli formatda shakllantiramiz
    const notesArray = [];
    if (forWhom) notesArray.push(`Kim uchun: ${forWhom}`);
    if (campaign) notesArray.push(`Kampaniya: ${campaign}`);
    if (source) notesArray.push(`Manba: ${source}`);
    if (region) notesArray.push(`Viloyat: ${region}`);
    const finalNotes = notesArray.length > 0 ? notesArray.join('\n') : null;

    // Sdelka yaratamiz
    const deal = await prisma.deal.create({
      data: {
        productName: product || 'Noma\'lum mahsulot',
        amount: 0,
        status: 'new',
        clientId: client.id,
        pipelineId: targetPipelineId,
        stageId: targetStageId,
        notes: finalNotes
      }
    });

    res.status(201).json({
      message: 'Lead muvaffaqiyatli qabul qilindi va sdelkaga aylantirildi',
      dealId: deal.id,
      clientId: client.id
    });

  } catch (error) {
    console.error('Webhook Lead Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
