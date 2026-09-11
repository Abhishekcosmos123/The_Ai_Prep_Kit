import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import type {
  InterviewKit,
  GenerationStatus,
  PracticeConfidence,
  GenerationStep,
} from "../types/kit.js";

const kitSchema = new Schema(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    input: {
      jd: { type: String, required: true },
      company_url: { type: String, required: true },
      days: { type: Number, required: true },
    },
    kit: { type: Schema.Types.Mixed, default: null },
    generationStatus: {
      type: String,
      enum: ["queued", "running", "completed", "failed", "incomplete"],
      default: "queued",
      index: true,
    },
    generationProgress: { type: [Schema.Types.Mixed], default: [] },
    generationPercent: { type: Number, default: 0 },
    generationError: {
      code: { type: String },
      message: { type: String },
    },
    practice: {
      confidences: { type: [Schema.Types.Mixed], default: [] },
    },
  },
  { timestamps: true }
);

export type KitDocument = HydratedDocument<{
  createdBy: mongoose.Types.ObjectId;
  input: { jd: string; company_url: string; days: number };
  kit: InterviewKit | null;
  generationStatus: GenerationStatus;
  generationProgress: GenerationStep[];
  generationPercent: number;
  generationError?: { code?: string; message?: string };
  practice: { confidences: PracticeConfidence[] };
  createdAt: Date;
  updatedAt: Date;
}>;

export const Kit: Model<KitDocument> =
  (mongoose.models.Kit as Model<KitDocument>) ||
  mongoose.model<KitDocument>("Kit", kitSchema);
