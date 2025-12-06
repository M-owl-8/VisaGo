/**
 * AI Training Data Exporter
 * Exports AIInteraction records to JSONL training datasets
 */

import { PrismaClient } from '@prisma/client';
import { AITrainingTaskType, AITrainingSource, TrainingExample } from './types';
import { mapChecklistInteractionToTrainingExample } from './mappers.checklist';
import { mapDocCheckInteractionToTrainingExample } from './mappers.doccheck';
import { mapRiskInteractionToTrainingExample } from './mappers.risk';
import { mapDocExplanationInteractionToTrainingExample } from './mappers.doc-explanation';
import { mapRulesExtractionInteractionToTrainingExample } from './mappers.rules-extraction';
import { writeJsonlFile, splitTrainVal } from './utils';
import { AI_TRAINING_DATA_DIR, DEFAULT_TRAIN_VAL_SPLIT } from './config';
import * as path from 'path';

/**
 * Map AIInteraction to TrainingExample based on task type
 */
export function mapAIInteractionToTrainingExample(interaction: any): TrainingExample | null {
  switch (interaction.taskType as AITrainingTaskType) {
    case 'checklist_enrichment':
      return mapChecklistInteractionToTrainingExample(interaction);
    case 'document_check':
      return mapDocCheckInteractionToTrainingExample(interaction);
    case 'risk_explanation':
      return mapRiskInteractionToTrainingExample(interaction);
    case 'document_explanation':
      return mapDocExplanationInteractionToTrainingExample(interaction);
    case 'rules_extraction':
      return mapRulesExtractionInteractionToTrainingExample(interaction);
    default:
      return null;
  }
}

/**
 * Export training data for a specific task type
 */
export async function exportTrainingDataForTask(
  prisma: PrismaClient,
  taskType: AITrainingTaskType,
  options?: {
    sourceFilter?: AITrainingSource[];
    since?: Date;
    until?: Date;
    minQualityScore?: number;
    limit?: number;
    outDir?: string;
  }
): Promise<void> {
  const outDir = options?.outDir || AI_TRAINING_DATA_DIR;

  // Build query with quality filters
  const where: any = {
    taskType,
    success: true, // Only successful interactions (STEP 8: Quality Filters)
  };

  // Quality filter: minimum quality score (default 0.7)
  const minQualityScore = options?.minQualityScore ?? 0.7;
  if (minQualityScore > 0) {
    where.OR = [
      { qualityScore: { gte: minQualityScore } },
      { qualityScore: null }, // Include records without quality score
    ];
  }

  if (options?.sourceFilter && options.sourceFilter.length > 0) {
    where.source = { in: options.sourceFilter };
  }

  if (options?.since) {
    where.createdAt = { ...where.createdAt, gte: options.since };
  }

  if (options?.until) {
    where.createdAt = { ...where.createdAt, lte: options.until };
  }

  if (options?.minQualityScore !== undefined) {
    where.qualityScore = { gte: options.minQualityScore };
  }

  // Query interactions
  let interactions = await prisma.aIInteraction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || undefined,
  });

  console.log(`[Export] Found ${interactions.length} interactions for ${taskType}`);

  // Map to TrainingExample
  const trainingExamples = interactions
    .map((interaction) => mapAIInteractionToTrainingExample(interaction))
    .filter((ex): ex is TrainingExample => ex !== null);

  console.log(`[Export] Mapped ${trainingExamples.length} training examples`);

  if (trainingExamples.length === 0) {
    console.log(`[Export] No training examples to export for ${taskType}`);
    return;
  }

  // Split into train/val
  const { train, val } = splitTrainVal(trainingExamples, DEFAULT_TRAIN_VAL_SPLIT.train);

  console.log(`[Export] Split: ${train.length} train, ${val.length} val`);

  // Convert to JSONL format (chat fine-tuning format)
  const trainRecords = train.map((example: TrainingExample) => ({
    messages: example.chatExample.messages,
    metadata: {
      taskType: example.taskType,
      source: example.source,
      ...example.meta,
    },
  }));

  const valRecords = val.map((example: TrainingExample) => ({
    messages: example.chatExample.messages,
    metadata: {
      taskType: example.taskType,
      source: example.source,
      ...example.meta,
    },
  }));

  // Write files
  const trainPath = path.join(outDir, `${taskType}.train.jsonl`);
  const valPath = path.join(outDir, `${taskType}.val.jsonl`);

  writeJsonlFile(trainPath, trainRecords);
  writeJsonlFile(valPath, valRecords);

  console.log(`[Export] ✅ Exported ${taskType}:`);
  console.log(`  Train: ${trainPath} (${trainRecords.length} examples)`);
  console.log(`  Val: ${valPath} (${valRecords.length} examples)`);
}

/**
 * Export eval scenarios as synthetic training data
 * TODO: Implement when eval scenarios have ideal outputs defined
 */
export async function exportEvalScenariosAsTrainingData(
  prisma: PrismaClient,
  options?: { outDir?: string }
): Promise<void> {
  const outDir = options?.outDir || AI_TRAINING_DATA_DIR;

  console.log('[Export] Exporting eval scenarios as synthetic training data...');
  console.log('[Export] ⚠️  TODO: Implement when eval scenarios have ideal outputs defined');

  // For now, just create placeholder files
  // In the future, this will:
  // 1. Import scenarios from src/ai-eval/scenarios.*.ts
  // 2. Generate ideal outputs (or use scenario.expectedOutput if defined)
  // 3. Build TrainingExample with source='synthetic'
  // 4. Export to ai-eval.*.jsonl files

  // Placeholder implementation
  const taskTypes: AITrainingTaskType[] = [
    'checklist_enrichment',
    'document_check',
    'risk_explanation',
    'document_explanation',
    'rules_extraction',
  ];

  for (const taskType of taskTypes) {
    const filePath = path.join(outDir, `ai-eval.${taskType}.jsonl`);
    // Create empty file for now
    writeJsonlFile(filePath, []);
    console.log(`[Export] Created placeholder: ${filePath}`);
  }
}
