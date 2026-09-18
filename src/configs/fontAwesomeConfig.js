/* v8 ignore start -- justification: this is simply a configuration file; no testing needed */

import { all } from '@awesome.me/kit-c3a50fe5a7/icons';
import * as brandIcons from '@awesome.me/kit-c3a50fe5a7/icons/classic/brands';
import * as classicRegularIcons from '@awesome.me/kit-c3a50fe5a7/icons/classic/regular';
import * as classicSolidIcons from '@awesome.me/kit-c3a50fe5a7/icons/classic/solid';
import { library } from '@fortawesome/fontawesome-svg-core';

library.add(...all);

/**
 * Configuration settings for Font Awesome icons, including brand, solid, and regular icon sets.
 * @type {Object}
 *
 * Properties:
 * - `brandIcons` (Object): An object containing all brand icons from Font Awesome.
 * - `classicSolidIcons` (Object): An object containing all classic solid icons from Font Awesome.
 * - `classicRegularIcons` (Object): An object containing all classic regular icons from Font Awesome.
 */
export const fontAwesomeConfig = {
  brandIcons,
  classicSolidIcons,
  classicRegularIcons,
};
