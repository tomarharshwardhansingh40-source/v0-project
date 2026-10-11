import mongoose from "mongoose";
import { ROLE_KEYS } from "../data/roles.js";

const skillGapSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true, trim: true, maxlength: 80 },
    priority: {
      type: String,
      required: true,
      enum: ["high", "medium", "low"],
    },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const roadmapDaySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true, min: 1, max: 7 },
    topic: { type: String, required: true, trim: true, maxlength: 120 },
    task: { type: String, required: true, trim: true, maxlength: 500 },
    estimatedMinutes: { type: Number, required: true, min: 10 },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 800 },
    skillsPracticed: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 1 && arr.length <= 10,
      },
    },
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetRole: {
      type: String,
      required: true,
      enum: ROLE_KEYS,
    },
    currentSkills: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 1 && arr.length <= 30,
      },
    },
    dailyMinutes: {
      type: Number,
      required: true,
      min: 15,
      max: 720,
    },
    skillGaps: {
      type: [skillGapSchema],
      required: true,
    },
    sevenDayRoadmap: {
      type: [roadmapDaySchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 7,
      },
    },
    projectRecommendations: {
      type: [projectSchema],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 2 && arr.length <= 3,
      },
    },
    overallAssessment: {
      type: String,
      required: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

export const Analysis = mongoose.model("Analysis", analysisSchema);
