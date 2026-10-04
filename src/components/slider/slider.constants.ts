export const SLIDER_CLASS = 'slider';
export const TRACK_CLASS = 'slider__track';
export const SLIDE_CLASS = 'slider__slide';

export const POSITION_CLASSES = ['is-active', 'is-near', 'is-far'] as const;
export const HIDDEN_CLASS = 'is-hidden';
export const ALL_POSITION_CLASSES = [...POSITION_CLASSES, HIDDEN_CLASS];
