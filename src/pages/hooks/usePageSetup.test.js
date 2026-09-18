import { faker } from '@faker-js/faker';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { constants } from 'configs/constants';
import { useSideBarStore } from 'features/ui/side-bar/store/sideBarStore';
import { useSiteHeaderStore } from 'features/ui/site-header/store/siteHeaderStore';

import { usePageSetup } from './usePageSetup';

// **********************************************************************
// * constants

let siteHeaderStore;
let sideBarStore;

// **********************************************************************
// * functions

// **********************************************************************
// * mock external dependencies

vi.mock('features/ui/site-header/store/siteHeaderStore');
vi.mock('features/ui/side-bar/store/sideBarStore');

// **********************************************************************
// * unit tests

describe('usePageSetup', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    siteHeaderStore = useSiteHeaderStore.__resetMockSiteHeaderStore();
    sideBarStore = useSideBarStore.__resetMockSideBarStore();
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('should set the page title with the title value when title is defined', () => {
    // * ARRANGE
    const title = faker.string.alphanumeric(10);

    // * ACT
    renderHook(() => usePageSetup({ title }));

    // * ASSERT
    expect(siteHeaderStore.setPageTitle).toHaveBeenCalledWith(title);
  });

  it('should set the page title with the default value when title is not defined', () => {
    // * ARRANGE
    const title = undefined;
    const expected = constants.APP_NAME;

    // * ACT
    renderHook(() => usePageSetup({ title }));

    // * ASSERT
    expect(siteHeaderStore.setPageTitle).toHaveBeenCalledWith(expected);
  });

  it('should set the page subtitle with the subtitle value when subtitle is defined', () => {
    // * ARRANGE
    const subtitle = faker.string.alphanumeric(10);

    // * ACT
    renderHook(() => usePageSetup({ subtitle }));

    // * ASSERT
    expect(siteHeaderStore.setPageSubtitle).toHaveBeenCalledWith(subtitle);
  });

  it('should set the page subtitle with an empty string when subtitle is not defined', () => {
    // * ARRANGE
    const subtitle = undefined;
    const expected = '';

    // * ACT
    renderHook(() => usePageSetup({ subtitle }));

    // * ASSERT
    expect(siteHeaderStore.setPageSubtitle).toHaveBeenCalledWith(expected);
  });

  it('should show side bar when showSideBar is true', () => {
    // * ARRANGE

    // * ACT
    renderHook(() => usePageSetup({ showSideBar: true }));

    // * ASSERT
    expect(sideBarStore.show).toHaveBeenCalled();
  });

  it('should hide side bar when showSideBar is false', () => {
    // * ARRANGE

    // * ACT
    renderHook(() => usePageSetup({ showSideBar: false }));

    // * ASSERT
    expect(sideBarStore.hide).toHaveBeenCalled();
  });
});
