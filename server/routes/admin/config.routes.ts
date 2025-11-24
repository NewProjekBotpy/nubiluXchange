import { Router, Request, Response } from 'express';
import { storage } from '../../storage';
import { requireAuth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/authorization';
import { validate } from '../../middleware/validation';
import { 
  insertAdminConfigSchema,
  adminConfigUpdateSchema,
  adminTemplateCreateSchema,
  adminRuleCreateSchema,
  adminBlacklistCreateSchema
} from '@shared/schema';
import { logError } from '../../utils/logger';

const router = Router();

// ========== ADMIN CONFIGS CRUD ROUTES ==========

// Get all admin configs
router.get('/configs', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configs = await storage.getAllAdminConfigs();
    res.json(configs);
  } catch (error: any) {
    logError(error as Error, 'Admin configs error:');
    res.status(500).json({ error: 'Failed to fetch admin configs' });
  }
});

// Get specific admin config by key
router.get('/configs/:key', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const config = await storage.getAdminConfig(key);
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }
    res.json(config);
  } catch (error: any) {
    logError(error as Error, 'Admin config get error:');
    res.status(500).json({ error: 'Failed to fetch admin config' });
  }
});

// Create or update admin config
router.post('/configs', [
  requireAuth,
  requireAdmin,
  validate({ body: insertAdminConfigSchema })
], async (req: Request, res: Response) => {
  try {
    const configData = {
      ...req.validatedData!.body,
      updatedBy: req.user!.id
    };
    
    const config = await storage.setAdminConfig(configData);
    res.status(201).json(config);
  } catch (error: any) {
    logError(error as Error, 'Admin config create error:');
    res.status(500).json({ error: 'Failed to create admin config' });
  }
});

// Update admin config
router.put('/configs/:key', [
  requireAuth,
  requireAdmin,
  validate({ body: adminConfigUpdateSchema })
], async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.validatedData!.body;
    
    const config = await storage.updateAdminConfig(key, value, req.user!.id);
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }
    
    res.json(config);
  } catch (error: any) {
    logError(error as Error, 'Admin config update error:');
    res.status(500).json({ error: 'Failed to update admin config' });
  }
});

// ========== ADMIN TEMPLATES CRUD ROUTES ==========

// Get all admin templates
router.get('/templates', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    let templates;
    
    if (type && typeof type === 'string') {
      templates = await storage.getAdminTemplatesByType(type);
    } else {
      templates = await storage.getAllAdminTemplates();
    }
    
    res.json(templates);
  } catch (error: any) {
    logError(error as Error, 'Admin templates error:');
    res.status(500).json({ error: 'Failed to fetch admin templates' });
  }
});

// Get specific admin template
router.get('/templates/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }
    
    const template = await storage.getAdminTemplate(id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error: any) {
    logError(error as Error, 'Admin template get error:');
    res.status(500).json({ error: 'Failed to fetch admin template' });
  }
});

// Create admin template
router.post('/templates', [
  requireAuth,
  requireAdmin,
  validate({ body: adminTemplateCreateSchema })
], async (req: Request, res: Response) => {
  try {
    const templateData = {
      ...req.validatedData!.body,
      createdBy: req.user!.id,
      updatedBy: req.user!.id
    };
    
    const template = await storage.createAdminTemplate(templateData);
    res.status(201).json(template);
  } catch (error: any) {
    logError(error as Error, 'Admin template create error:');
    res.status(500).json({ error: 'Failed to create admin template' });
  }
});

// Update admin template
router.put('/templates/:id', [
  requireAuth,
  requireAdmin,
  validate({ body: adminTemplateCreateSchema })
], async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }
    
    const updateData = {
      ...req.validatedData!.body,
      updatedBy: req.user!.id
    };
    
    const template = await storage.updateAdminTemplate(id, updateData);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error: any) {
    logError(error as Error, 'Admin template update error:');
    res.status(500).json({ error: 'Failed to update admin template' });
  }
});

// Delete admin template
router.delete('/templates/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }
    
    const template = await storage.getAdminTemplate(id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    await storage.deleteAdminTemplate(id);
    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    logError(error as Error, 'Admin template delete error:');
    res.status(500).json({ error: 'Failed to delete admin template' });
  }
});

// ========== ADMIN RULES CRUD ROUTES ==========

// Get all admin rules
router.get('/rules', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { ruleType, active } = req.query;
    let rules;
    
    if (ruleType && typeof ruleType === 'string') {
      rules = await storage.getAdminRulesByType(ruleType);
    } else if (active === 'true') {
      rules = await storage.getActiveAdminRules();
    } else {
      rules = await storage.getAllAdminRules();
    }
    
    res.json(rules);
  } catch (error: any) {
    logError(error as Error, 'Admin rules error:');
    res.status(500).json({ error: 'Failed to fetch admin rules' });
  }
});

// Get specific admin rule
router.get('/rules/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }
    
    const rule = await storage.getAdminRule(id);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    res.json(rule);
  } catch (error: any) {
    logError(error as Error, 'Admin rule get error:');
    res.status(500).json({ error: 'Failed to fetch admin rule' });
  }
});

// Create admin rule
router.post('/rules', [
  requireAuth,
  requireAdmin,
  validate({ body: adminRuleCreateSchema })
], async (req: Request, res: Response) => {
  try {
    const ruleData = {
      ...req.validatedData!.body,
      createdBy: req.user!.id,
      updatedBy: req.user!.id
    };
    
    const rule = await storage.createAdminRule(ruleData);
    res.status(201).json(rule);
  } catch (error: any) {
    logError(error as Error, 'Admin rule create error:');
    res.status(500).json({ error: 'Failed to create admin rule' });
  }
});

// Update admin rule
router.put('/rules/:id', [
  requireAuth,
  requireAdmin,
  validate({ body: adminRuleCreateSchema })
], async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }
    
    const updateData = {
      ...req.validatedData!.body,
      updatedBy: req.user!.id
    };
    
    const rule = await storage.updateAdminRule(id, updateData);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    res.json(rule);
  } catch (error: any) {
    logError(error as Error, 'Admin rule update error:');
    res.status(500).json({ error: 'Failed to update admin rule' });
  }
});

// Update rule priority
router.patch('/rules/:id/priority', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }
    
    const { priority } = req.body;
    if (typeof priority !== 'number') {
      return res.status(400).json({ error: 'Priority must be a number' });
    }
    
    const rule = await storage.getAdminRule(id);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    const updatedRule = await storage.updateAdminRule(id, { ...rule, priority, updatedBy: req.user!.id });
    res.json(updatedRule);
  } catch (error: any) {
    logError(error as Error, 'Admin rule priority update error:');
    res.status(500).json({ error: 'Failed to update rule priority' });
  }
});

// Delete admin rule
router.delete('/rules/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }
    
    const rule = await storage.getAdminRule(id);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    await storage.deleteAdminRule(id);
    res.json({ message: 'Rule deleted successfully' });
  } catch (error: any) {
    logError(error as Error, 'Admin rule delete error:');
    res.status(500).json({ error: 'Failed to delete admin rule' });
  }
});

// ========== ADMIN BLACKLIST CRUD ROUTES ==========

// Get all admin blacklist items
router.get('/blacklist', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { type, active } = req.query;
    let blacklistItems;
    
    if (type && typeof type === 'string') {
      blacklistItems = await storage.getAdminBlacklistByType(type);
    } else if (active === 'true') {
      blacklistItems = await storage.getActiveAdminBlacklist();
    } else {
      blacklistItems = await storage.getAllAdminBlacklist();
    }
    
    res.json(blacklistItems);
  } catch (error: any) {
    logError(error as Error, 'Admin blacklist error:');
    res.status(500).json({ error: 'Failed to fetch admin blacklist' });
  }
});

// Get specific blacklist item
router.get('/blacklist/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid blacklist item ID' });
    }
    
    const item = await storage.getAdminBlacklistItem(id);
    if (!item) {
      return res.status(404).json({ error: 'Blacklist item not found' });
    }
    
    res.json(item);
  } catch (error: any) {
    logError(error as Error, 'Admin blacklist get error:');
    res.status(500).json({ error: 'Failed to fetch blacklist item' });
  }
});

// Create blacklist item
router.post('/blacklist', [
  requireAuth,
  requireAdmin,
  validate({ body: adminBlacklistCreateSchema })
], async (req: Request, res: Response) => {
  try {
    const blacklistData = {
      ...req.validatedData!.body,
      createdBy: req.user!.id
    };
    
    const item = await storage.createAdminBlacklistItem(blacklistData);
    res.status(201).json(item);
  } catch (error: any) {
    logError(error as Error, 'Admin blacklist create error:');
    res.status(500).json({ error: 'Failed to create blacklist item' });
  }
});

// Update blacklist item
router.put('/blacklist/:id', [
  requireAuth,
  requireAdmin,
  validate({ body: adminBlacklistCreateSchema })
], async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid blacklist item ID' });
    }
    
    const updateData = req.validatedData!.body;
    
    const item = await storage.updateAdminBlacklistItem(id, updateData);
    if (!item) {
      return res.status(404).json({ error: 'Blacklist item not found' });
    }
    
    res.json(item);
  } catch (error: any) {
    logError(error as Error, 'Admin blacklist update error:');
    res.status(500).json({ error: 'Failed to update blacklist item' });
  }
});

// Delete blacklist item
router.delete('/blacklist/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid blacklist item ID' });
    }
    
    const item = await storage.getAdminBlacklistItem(id);
    if (!item) {
      return res.status(404).json({ error: 'Blacklist item not found' });
    }
    
    await storage.deleteAdminBlacklistItem(id);
    res.json({ message: 'Blacklist item deleted successfully' });
  } catch (error: any) {
    logError(error as Error, 'Admin blacklist delete error:');
    res.status(500).json({ error: 'Failed to delete blacklist item' });
  }
});

export default router;
