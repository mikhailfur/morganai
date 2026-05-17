import { Router, Response } from 'express';
import { database } from '../database';
import { supportMiddleware } from '../auth';

const router = Router();

// === User routes (authMiddleware already applied in index.ts) ===

router.get('/tickets', async (req: any, res: Response) => {
  try {
    const tickets = await database.getTicketsByUser(req.user.userId);
    res.json({ tickets });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.post('/tickets', async (req: any, res: Response) => {
  try {
    const { subject, message } = req.body;
    if (!subject?.trim()) { res.status(400).json({ error: 'Тема обязательна' }); return; }
    if (!message?.trim()) { res.status(400).json({ error: 'Сообщение обязательно' }); return; }

    const ticketId = await database.createTicket(req.user.userId, subject.trim());
    await database.addTicketMessage(ticketId, req.user.userId, 'user', message.trim());

    const ticket = await database.getTicketWithMessages(ticketId);
    res.status(201).json({ ticket });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.get('/tickets/:id', async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ticket = await database.getTicketWithMessages(id);
    if (!ticket) { res.status(404).json({ error: 'Тикет не найден' }); return; }
    if (ticket.user_id !== req.user.userId) { res.status(403).json({ error: 'Доступ запрещён' }); return; }
    res.json({ ticket });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.post('/tickets/:id/messages', async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ticket = await database.getTicketWithMessages(id);
    if (!ticket) { res.status(404).json({ error: 'Тикет не найден' }); return; }
    if (ticket.user_id !== req.user.userId) { res.status(403).json({ error: 'Доступ запрещён' }); return; }
    if (ticket.status === 'closed') { res.status(400).json({ error: 'Тикет закрыт' }); return; }

    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: 'Сообщение пустое' }); return; }

    const msgId = await database.addTicketMessage(id, req.user.userId, 'user', content.trim());
    res.status(201).json({ message_id: msgId });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

// === Staff routes (support or admin) ===

router.get('/admin/tickets', supportMiddleware, async (req: any, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 0;
    const tickets = await database.getAllTickets(status, page);
    res.json({ tickets });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.get('/admin/tickets/:id', supportMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ticket = await database.getTicketWithMessages(id);
    if (!ticket) { res.status(404).json({ error: 'Тикет не найден' }); return; }
    res.json({ ticket });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.post('/admin/tickets/:id/messages', supportMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ticket = await database.getTicketWithMessages(id);
    if (!ticket) { res.status(404).json({ error: 'Тикет не найден' }); return; }

    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: 'Сообщение пустое' }); return; }

    const msgId = await database.addTicketMessage(id, req.user.userId, 'support', content.trim());
    res.status(201).json({ message_id: msgId });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

router.patch('/admin/tickets/:id/status', supportMiddleware, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    const validStatuses = ['open', 'in_progress', 'closed'];
    if (!validStatuses.includes(status)) { res.status(400).json({ error: 'Неверный статус' }); return; }

    await database.updateTicketStatus(id, status);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;
