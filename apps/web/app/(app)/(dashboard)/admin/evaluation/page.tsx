'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/api/config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RefreshCcw, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface EvaluationMetrics {
  // Checklist metrics
  checklistAccuracy: number;
  checklistPrecision: number;
  checklistRecall: number;
  checklistF1Score: number;

  // Document verification metrics
  docVerificationAccuracy: number;
  docVerificationPrecision: number;
  docVerificationRecall: number;
  docVerificationF1Score: number;

  // Performance metrics
  averageLatencyMs: number;
  averageTokenUsage: number;
  totalTestCases: number;
  passedTestCases: number;
  failedTestCases: number;

  // Error breakdown
  falsePositives: number;
  falseNegatives: number;
  truePositives: number;
  trueNegatives: number;
}

interface EvaluationResult {
  caseId: string;
  caseName: string;
  checklistScore: {
    accuracy: number;
    matches: number;
    missing: number;
    extra: number;
  };
  docVerificationScore?: {
    accuracy: number;
    passed: number;
    failed: number;
  };
  latencyMs?: number;
  tokenUsage?: number;
  errors?: string[];
}

export default function EvaluationPage() {
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/evaluation/metrics`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load evaluation metrics');
      }

      const result = await response.json();
      if (result.success) {
        setMetrics(result.data.metrics);
        setResults(result.data.results || []);
      } else {
        setError(result.error?.message || 'Failed to load metrics');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load evaluation metrics');
    } finally {
      setLoading(false);
    }
  };

  const runEvaluation = async () => {
    try {
      setRunning(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/evaluation/run`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to run evaluation');
      }

      const result = await response.json();
      if (result.success) {
        setMetrics(result.data.metrics);
        setResults(result.data.results || []);
      } else {
        setError(result.error?.message || 'Failed to run evaluation');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run evaluation');
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading && !metrics) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-white">Evaluation Dashboard</h1>
        <p className="text-white/70">Loading metrics...</p>
      </div>
    );
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-emerald-400';
    if (accuracy >= 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAccuracyBg = (accuracy: number) => {
    if (accuracy >= 90) return 'bg-emerald-500/20 border-emerald-500/30';
    if (accuracy >= 75) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Evaluation Dashboard</h1>
          <p className="text-white/60">
            Track checklist accuracy, document verification quality, and system performance
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={fetchMetrics}
            disabled={loading}
            variant="secondary"
            className="bg-white/10 text-white hover:bg-white/20"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="ml-2">Refresh</span>
          </Button>
          <Button
            onClick={runEvaluation}
            disabled={running}
            className="bg-primary text-white hover:bg-primary/90"
          >
            <TrendingUp size={16} className={running ? 'animate-spin' : ''} />
            <span className="ml-2">{running ? 'Running...' : 'Run Evaluation'}</span>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4 bg-red-500/20 border-red-500/30">
          <div className="flex items-center gap-2 text-red-300">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {metrics && (
        <>
          {/* Overall Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className={`p-6 border ${getAccuracyBg(metrics.checklistAccuracy)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Checklist Accuracy</span>
                <CheckCircle size={20} className={getAccuracyColor(metrics.checklistAccuracy)} />
              </div>
              <div className={`text-3xl font-bold ${getAccuracyColor(metrics.checklistAccuracy)}`}>
                {metrics.checklistAccuracy.toFixed(1)}%
              </div>
              <div className="text-xs text-white/50 mt-1">
                F1: {metrics.checklistF1Score.toFixed(2)}
              </div>
            </Card>

            <Card className={`p-6 border ${getAccuracyBg(metrics.docVerificationAccuracy)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Doc Verification Accuracy</span>
                <CheckCircle size={20} className={getAccuracyColor(metrics.docVerificationAccuracy)} />
              </div>
              <div className={`text-3xl font-bold ${getAccuracyColor(metrics.docVerificationAccuracy)}`}>
                {metrics.docVerificationAccuracy.toFixed(1)}%
              </div>
              <div className="text-xs text-white/50 mt-1">
                F1: {metrics.docVerificationF1Score.toFixed(2)}
              </div>
            </Card>

            <Card className="p-6 border border-white/10 bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Avg Latency</span>
                <Clock size={20} className="text-white/50" />
              </div>
              <div className="text-3xl font-bold text-white">
                {metrics.averageLatencyMs.toFixed(0)}ms
              </div>
              <div className="text-xs text-white/50 mt-1">
                {metrics.averageTokenUsage.toFixed(0)} tokens avg
              </div>
            </Card>

            <Card className="p-6 border border-white/10 bg-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/70">Test Cases</span>
                <TrendingUp size={20} className="text-white/50" />
              </div>
              <div className="text-3xl font-bold text-white">{metrics.totalTestCases}</div>
              <div className="text-xs text-white/50 mt-1">
                {metrics.passedTestCases} passed, {metrics.failedTestCases} failed
              </div>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Checklist Metrics */}
            <Card className="p-6 border border-white/10 bg-white/5">
              <h2 className="text-lg font-semibold text-white mb-4">Checklist Generation Metrics</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/70">Precision</span>
                  <span className="text-sm font-medium text-white">
                    {(metrics.checklistPrecision * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/70">Recall</span>
                  <span className="text-sm font-medium text-white">
                    {(metrics.checklistRecall * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/70">F1 Score</span>
                  <span className="text-sm font-medium text-white">
                    {metrics.checklistF1Score.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Document Verification Metrics */}
            <Card className="p-6 border border-white/10 bg-white/5">
              <h2 className="text-lg font-semibold text-white mb-4">Document Verification Metrics</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/70">Precision</span>
                  <span className="text-sm font-medium text-white">
                    {(metrics.docVerificationPrecision * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/70">Recall</span>
                  <span className="text-sm font-medium text-white">
                    {(metrics.docVerificationRecall * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/70">F1 Score</span>
                  <span className="text-sm font-medium text-white">
                    {metrics.docVerificationF1Score.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Error Breakdown */}
          <Card className="p-6 border border-white/10 bg-white/5">
            <h2 className="text-lg font-semibold text-white mb-4">Error Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-white/70 mb-1">True Positives</div>
                <div className="text-2xl font-bold text-emerald-400">{metrics.truePositives}</div>
              </div>
              <div>
                <div className="text-sm text-white/70 mb-1">True Negatives</div>
                <div className="text-2xl font-bold text-emerald-400">{metrics.trueNegatives}</div>
              </div>
              <div>
                <div className="text-sm text-white/70 mb-1">False Positives</div>
                <div className="text-2xl font-bold text-red-400">{metrics.falsePositives}</div>
              </div>
              <div>
                <div className="text-sm text-white/70 mb-1">False Negatives</div>
                <div className="text-2xl font-bold text-red-400">{metrics.falseNegatives}</div>
              </div>
            </div>
          </Card>

          {/* Test Results */}
          {results.length > 0 && (
            <Card className="p-6 border border-white/10 bg-white/5">
              <h2 className="text-lg font-semibold text-white mb-4">Recent Test Results</h2>
              <div className="space-y-3">
                {results.slice(0, 10).map((result) => (
                  <div
                    key={result.caseId}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-white">{result.caseName}</div>
                      <div className="text-xs text-white/60 mt-1">
                        Checklist: {result.checklistScore.accuracy.toFixed(1)}% accuracy
                        {result.docVerificationScore && (
                          <> • Doc: {result.docVerificationScore.accuracy.toFixed(1)}% accuracy</>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getAccuracyColor(result.checklistScore.accuracy)}`}>
                        {result.checklistScore.accuracy.toFixed(0)}%
                      </div>
                      {result.latencyMs && (
                        <div className="text-xs text-white/50">{result.latencyMs}ms</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {!metrics && !loading && (
        <Card className="p-6 border border-white/10 bg-white/5">
          <div className="text-center py-8">
            <p className="text-white/70 mb-4">No evaluation metrics available yet.</p>
            <Button onClick={runEvaluation} className="bg-primary text-white hover:bg-primary/90">
              <TrendingUp size={16} />
              <span className="ml-2">Run First Evaluation</span>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}



