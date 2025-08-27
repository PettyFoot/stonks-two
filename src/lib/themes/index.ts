export * from './types';
export * from './utils';
export { defaultTheme } from './defaultTheme';
export { darkTheme } from './darkTheme';  
export { partyTheme } from './partyTheme';

import { defaultTheme } from './defaultTheme';
import { darkTheme } from './darkTheme';
import { partyTheme } from './partyTheme';
import { Theme } from './types';

export const availableThemes: Theme[] = [
  defaultTheme,
  darkTheme,
  partyTheme
];

export const getThemeByName = (name: string): Theme => {
  return availableThemes.find(theme => theme.name === name) || defaultTheme;
};