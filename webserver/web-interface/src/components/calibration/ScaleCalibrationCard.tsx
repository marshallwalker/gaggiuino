import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Scale, RotateCcw } from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useScalesData from '@/hooks/useScalesData';
import { setScalesFactors, tareScales } from '@/components/client/ScalesClient';

function formatRaw(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function ScaleCalibrationCard() {
  const live = useScalesData();
  const [f1Input, setF1Input] = useState<string>('');
  const [f2Input, setF2Input] = useState<string>('');
  const [knownWeight, setKnownWeight] = useState<string>('100');
  const [busy, setBusy] = useState<'tare' | 'apply' | 'auto' | null>(null);

  // Seed the editable inputs from the live snapshot the first time it lands,
  // and re-seed if the persisted factors change underneath us (e.g. another
  // client tweaked them) but the inputs haven't been touched yet.
  useEffect(() => {
    if (f1Input === '' && live.factor1) setF1Input(live.factor1.toFixed(2));
    if (f2Input === '' && live.factor2) setF2Input(live.factor2.toFixed(2));
  }, [live.factor1, live.factor2]);

  async function handleTare() {
    setBusy('tare');
    try {
      await tareScales();
      toast.success('Scales tared');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Tare failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleApply() {
    const f1 = parseFloat(f1Input);
    const f2 = parseFloat(f2Input);
    if (!Number.isFinite(f1) || !Number.isFinite(f2) || f1 <= 0 || f2 <= 0) {
      toast.error('Factors must be positive numbers');
      return;
    }
    setBusy('apply');
    try {
      await setScalesFactors(f1, f2);
      toast.success(`Factors applied: ${f1.toFixed(2)} / ${f2.toFixed(2)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Apply failed');
    } finally {
      setBusy(null);
    }
  }

  // "Auto" assumes the known weight is centered (each cell carries half).
  // Computes factor = raw / (knownWeight / 2) per cell from the current
  // tared raw values, then sends + persists. User must Tare first with the
  // basket empty, then place the known weight, then click Auto.
  async function handleAuto() {
    const w = parseFloat(knownWeight);
    if (!Number.isFinite(w) || w <= 0) {
      toast.error('Known weight must be > 0');
      return;
    }
    if (!live.raw1 && !live.raw2) {
      toast.error('No raw signal — is the basket on the scales?');
      return;
    }
    const halfW = w / 2;
    const f1 = Math.abs(live.raw1) / halfW;
    const f2 = Math.abs(live.raw2) / halfW;
    setBusy('auto');
    try {
      await setScalesFactors(f1, f2);
      setF1Input(f1.toFixed(2));
      setF2Input(f2.toFixed(2));
      toast.success(`Auto-cal: f1=${f1.toFixed(2)} f2=${f2.toFixed(2)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Auto-calibrate failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">Scales Calibration</CardTitle>
        <CardDescription>
          Tare with the basket empty, place a known weight (centered),
          then either click Auto-calibrate or fine-tune each cell&apos;s
          factor manually. Factors persist to EEPROM.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {!live.present && (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No hardware scales detected. Connect them and reset the STM to
            populate live values.
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Cell 1 raw</div>
            <div className="font-mono text-lg">{formatRaw(live.raw1)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Cell 2 raw</div>
            <div className="font-mono text-lg">{formatRaw(live.raw2)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Weight</div>
            <div className="font-mono text-lg">{live.weight.toFixed(2)} g</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="scales-f1" className="text-xs">Cell 1 factor</Label>
            <Input
              id="scales-f1"
              type="number"
              step="0.01"
              value={f1Input}
              onChange={(e) => setF1Input(e.target.value)}
              className="font-mono"
            />
          </div>
          <div>
            <Label htmlFor="scales-f2" className="text-xs">Cell 2 factor</Label>
            <Input
              id="scales-f2"
              type="number"
              step="0.01"
              value={f2Input}
              onChange={(e) => setF2Input(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="scales-known-weight" className="text-xs">Known weight (g)</Label>
          <Input
            id="scales-known-weight"
            type="number"
            step="0.1"
            min="1"
            value={knownWeight}
            onChange={(e) => setKnownWeight(e.target.value)}
            className="font-mono"
          />
        </div>
      </CardContent>

      <CardFooter className="flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTare}
          disabled={!live.present || busy !== null}
        >
          <RotateCcw />
          {busy === 'tare' ? 'Taring…' : 'Tare'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleApply}
          disabled={busy !== null}
        >
          {busy === 'apply' ? 'Applying…' : 'Apply factors'}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleAuto}
          disabled={!live.present || busy !== null}
        >
          <Scale />
          {busy === 'auto' ? 'Calibrating…' : 'Auto-calibrate'}
        </Button>
      </CardFooter>
    </Card>
  );
}
