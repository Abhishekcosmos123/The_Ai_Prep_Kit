import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { kitService } from "../services/kits/kitService.js";

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

const practiceSchema = z.object({
  flashcard_id: z.string().min(1),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export async function getPractice(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await kitService.getPractice(req.user!.id, paramId(req.params.id));
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function postPractice(req: Request, res: Response, next: NextFunction) {
  try {
    const body = practiceSchema.parse(req.body);
    const data = await kitService.recordPractice(req.user!.id, paramId(req.params.id), body);
    res.json(data);
  } catch (error) {
    next(error);
  }
}
