import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { kitService } from "../services/kits/kitService.js";

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

const createSchema = z.object({
  jd: z.string().min(1).max(50000),
  company_url: z.string().url(),
  days: z.number().int().min(1).max(60),
  force: z.boolean().optional(),
});

export async function listKits(req: Request, res: Response, next: NextFunction) {
  try {
    const kits = await kitService.listForUser(req.user!.id);
    res.json({ kits });
  } catch (error) {
    next(error);
  }
}

export async function createKit(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createSchema.parse(req.body);
    const kit = await kitService.createAndGenerate(req.user!.id, body);
    res.status(201).json({ kit });
  } catch (error) {
    next(error);
  }
}

const batchSchema = z.object({
  cases: z
    .array(
      z.object({
        jd: z.string().min(1).max(50000),
        company_url: z.string().url(),
        days: z.number().int().min(1).max(60),
      })
    )
    .min(1)
    .max(25),
});

export async function createKitBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const body = batchSchema.parse(req.body);
    const kits = await kitService.createBatch(req.user!.id, body.cases);
    res.status(201).json({ kits });
  } catch (error) {
    next(error);
  }
}

export async function getKit(req: Request, res: Response, next: NextFunction) {
  try {
    const kit = await kitService.getForUser(req.user!.id, paramId(req.params.id));
    res.json({ kit });
  } catch (error) {
    next(error);
  }
}

export async function updateKit(req: Request, res: Response, next: NextFunction) {
  try {
    const kit = await kitService.updateKit(req.user!.id, paramId(req.params.id), req.body);
    res.json({ kit });
  } catch (error) {
    next(error);
  }
}

export async function deleteKit(req: Request, res: Response, next: NextFunction) {
  try {
    await kitService.deleteKit(req.user!.id, paramId(req.params.id));
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function regenerateCompanyBrief(req: Request, res: Response, next: NextFunction) {
  try {
    const kit = await kitService.regenerateCompanyBrief(req.user!.id, paramId(req.params.id));
    res.json({ kit });
  } catch (error) {
    next(error);
  }
}

export async function regenerateQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const category = typeof req.body?.category === "string" ? req.body.category : undefined;
    const kit = await kitService.regenerateQuestions(
      req.user!.id,
      paramId(req.params.id),
      category
    );
    res.json({ kit });
  } catch (error) {
    next(error);
  }
}

export async function regenerateSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const kit = await kitService.regenerateSchedule(req.user!.id, paramId(req.params.id));
    res.json({ kit });
  } catch (error) {
    next(error);
  }
}

export async function generationStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const kit = await kitService.getForUser(req.user!.id, paramId(req.params.id));
    res.json({
      id: kit.id,
      generationStatus: kit.generationStatus,
      generationPercent: kit.generationPercent,
      generationProgress: kit.generationProgress,
      generationError: kit.generationError,
    });
  } catch (error) {
    next(error);
  }
}
