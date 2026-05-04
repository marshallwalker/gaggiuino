/* eslint-disable max-classes-per-file */

function notDefined(value: unknown): boolean {
  return (value === null || value === undefined);
}

export const PhaseTypes = Object.freeze({
  FLOW: Symbol('FLOW'),
  PRESSURE: Symbol('PRESSURE'),
});
export type PhaseType = typeof PhaseTypes[keyof typeof PhaseTypes];

export function parsePhaseType(phaseTypeObj: unknown): PhaseType | undefined {
  if (notDefined(phaseTypeObj)) {
    return undefined;
  }
  const phaseType = (PhaseTypes as Record<string, symbol>)[phaseTypeObj as string];

  if (!phaseType) {
    throw Error(`${String(phaseTypeObj)} not one of PhaseTypes{${Object.keys(PhaseTypes).join(',')}}`);
  }
  return phaseType;
}

export const CurveStyles = Object.freeze({
  EASE_IN: Symbol('EASE_IN'),
  EASE_OUT: Symbol('EASE_OUT'),
  EASE_IN_OUT: Symbol('EASE_IN_OUT'),
  LINEAR: Symbol('LINEAR'),
  INSTANT: Symbol('INSTANT'),
});
export type CurveStyle = typeof CurveStyles[keyof typeof CurveStyles];

export function parseCurveStyle(curveStyleObj: unknown): CurveStyle | undefined {
  if (notDefined(curveStyleObj)) {
    return undefined;
  }
  const curveStyle = (CurveStyles as Record<string, symbol>)[curveStyleObj as string];

  if (!curveStyle) {
    throw Error(`${String(curveStyleObj)} not one of CurveStyles{${Object.keys(CurveStyles).join(',')}}`);
  }
  return curveStyle;
}

export interface TransitionRaw {
  start: number;
  end?: number;
  curve?: unknown;
  time?: number;
}

export class Transition {
  start: number;
  end?: number;
  curve?: CurveStyle;
  time?: number;

  constructor(start: number, end?: number, curve?: CurveStyle, time?: number) {
    if (start === null || start === undefined) {
      throw Error('start is required for Transition');
    }
    this.start = start;
    this.end = end;
    this.curve = curve;
    this.time = time;
  }

  static parse(obj: TransitionRaw): Transition {
    return new Transition(obj.start, obj.end, parseCurveStyle(obj.curve), obj.time);
  }
}

export interface PhaseStopConditionsRaw {
  time?: number;
  pressureAbove?: number;
  pressureBelow?: number;
  flowAbove?: number;
  flowBelow?: number;
  weight?: number;
  waterPumpedInPhase?: number;
}

export class PhaseStopConditions {
  time?: number;
  pressureAbove?: number;
  pressureBelow?: number;
  flowAbove?: number;
  flowBelow?: number;
  weight?: number;
  waterPumpedInPhase?: number;

  constructor(
    time?: number,
    pressureAbove?: number,
    pressureBelow?: number,
    flowAbove?: number,
    flowBelow?: number,
    weight?: number,
    waterPumpedInPhase?: number,
  ) {
    this.time = time;
    this.pressureAbove = pressureAbove;
    this.pressureBelow = pressureBelow;
    this.flowAbove = flowAbove;
    this.flowBelow = flowBelow;
    this.weight = weight;
    this.waterPumpedInPhase = waterPumpedInPhase;
  }

  static parse(obj: PhaseStopConditionsRaw): PhaseStopConditions {
    return new PhaseStopConditions(
      obj.time,
      obj.pressureAbove,
      obj.pressureBelow,
      obj.flowAbove,
      obj.flowBelow,
      obj.weight,
      obj.waterPumpedInPhase,
    );
  }
}

export interface PhaseRaw {
  type: unknown;
  target: TransitionRaw;
  restriction?: number;
  stopConditions?: PhaseStopConditionsRaw;
}

export class Phase {
  type: PhaseType | undefined;
  target: Transition;
  restriction?: number;
  stopConditions?: PhaseStopConditions;

  constructor(type: PhaseType | undefined, target: Transition, restriction?: number, stopConditions?: PhaseStopConditions) {
    if (notDefined(type) || notDefined(target)) {
      throw Error('type and target are requred for Phase');
    }
    this.type = type;
    this.target = target;
    this.restriction = restriction;
    this.stopConditions = stopConditions;
  }

  static parse(obj: PhaseRaw): Phase {
    return new Phase(
      parsePhaseType(obj.type),
      Transition.parse(obj.target),
      obj.restriction,
      obj.stopConditions ? PhaseStopConditions.parse(obj.stopConditions) : undefined,
    );
  }
}

export interface GlobalStopConditionsRaw {
  time?: number;
  weight?: number;
  waterPumped?: number;
}

export class GlobalStopConditions {
  time?: number;
  weight?: number;
  waterPumped?: number;

  constructor(time?: number, weight?: number, waterPumped?: number) {
    this.time = time;
    this.weight = weight;
    this.waterPumped = waterPumped;
  }

  static parse(obj: GlobalStopConditionsRaw): GlobalStopConditions {
    return new GlobalStopConditions(
      obj.time,
      obj.weight,
      obj.waterPumped,
    );
  }
}

export interface ProfileRaw {
  phases?: PhaseRaw[];
  globalStopConditions?: GlobalStopConditionsRaw;
}

export class Profile {
  phases: Phase[];
  globalStopConditions?: GlobalStopConditions;

  constructor(phases: Phase[], globalStopConditions?: GlobalStopConditions) {
    this.phases = phases;
    this.globalStopConditions = globalStopConditions;
  }

  static parse(obj: ProfileRaw): Profile {
    return new Profile(
      Array.isArray(obj.phases) ? obj.phases.map((phase) => Phase.parse(phase)) : [],
      obj.globalStopConditions ? GlobalStopConditions.parse(obj.globalStopConditions) : undefined,
    );
  }
}
