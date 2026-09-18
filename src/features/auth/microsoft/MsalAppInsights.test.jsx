import { EventType } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { faker } from '@faker-js/faker';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAppInsights } from 'features/logging/appInsights/telemetryService';

import { MsalAppInsights } from './MsalAppInsights';

// **********************************************************************
// * constants

const childrenContent = faker.string.alphanumeric(10);

const defaultProps = {
  children: <div>{childrenContent}</div>,
};

let msal;
let appInsights;
let eventCallbacks;

// **********************************************************************
// * functions

const getComponentToRender = (props) => {
  return <MsalAppInsights {...props} />;
};

const invokeAllCallbacks = (eventMessage) => {
  eventCallbacks.forEach((callback) => {
    callback(eventMessage);
  });
};

// **********************************************************************
// * mock external dependencies

vi.mock('@azure/msal-react');
vi.mock('features/logging/appInsights/telemetryService');

// **********************************************************************
// * unit tests

describe('MsalAppInsights', () => {
  // **********************************************************************
  // * setup

  beforeEach(() => {
    eventCallbacks = [];
    msal = useMsal.__resetMockMsal();
    appInsights = getAppInsights.__resetMockAppInsights();
  });

  // **********************************************************************
  // * tear-down

  // **********************************************************************
  // * execution

  it('renders without crashing', () => {
    render(getComponentToRender(defaultProps));
    expect(true).toBe(true);
  });

  it('invokes addEventCallback when mounting', () => {
    render(getComponentToRender(defaultProps));
    expect(msal.instance.addEventCallback).toHaveBeenCalled();
  });

  it('invokes removeEventCallback when unmounting and a callback id exists', () => {
    // * ARRANGE
    msal.instance.addEventCallback.mockReturnValue(1);

    // * ACT
    const { unmount } = render(getComponentToRender(defaultProps));
    unmount();

    // * ASSERT
    expect(msal.instance.removeEventCallback).toHaveBeenCalled();
  });

  it('does not invoke removeEventCallback when unmounting and no callback id exists', () => {
    // * ARRANGE
    msal.instance.addEventCallback.mockImplementation(vi.fn());

    // * ACT
    const { unmount } = render(getComponentToRender(defaultProps));
    unmount();

    // * ASSERT
    expect(msal.instance.removeEventCallback).not.toHaveBeenCalled();
  });

  it('invokes setAuthenticatedUserContext after LOGIN_SUCCESS', () => {
    // * ARRANGE
    const eventType = EventType.LOGIN_SUCCESS;
    const userName = `${faker.person.firstName()} ${faker.person.lastName()}`;
    const accountId = faker.string.uuid();
    const payload = { account: { username: userName, localAccountId: accountId } };
    const eventMessage = { eventType, payload };

    msal.instance.addEventCallback.mockImplementation((callback) => {
      eventCallbacks.push(callback);
    });

    // * ACT
    render(getComponentToRender(defaultProps));
    act(() => invokeAllCallbacks(eventMessage));

    // * ASSERT
    expect(appInsights.setAuthenticatedUserContext).toHaveBeenCalledWith(userName.toLowerCase(), accountId, true);
  });

  it('invokes setAuthenticatedUserContext after HANDLE_REDIRECT_END and the msal instance has at least 1 account', () => {
    // * ARRANGE
    const eventType = EventType.HANDLE_REDIRECT_END;
    const userName = `${faker.person.firstName()} ${faker.person.lastName()}`;
    const accountId = faker.string.uuid();
    const payload = { account: { username: userName, localAccountId: accountId } };
    const eventMessage = { eventType, payload };

    msal.instance.getAllAccounts.mockReturnValue([payload.account]);

    msal.instance.addEventCallback.mockImplementation((callback) => {
      eventCallbacks.push(callback);
    });

    // * ACT
    render(getComponentToRender(defaultProps));
    act(() => invokeAllCallbacks(eventMessage));

    // * ASSERT
    expect(appInsights.setAuthenticatedUserContext).toHaveBeenCalledWith(userName.toLowerCase(), accountId, true);
  });

  it('does not invoke setAuthenticatedUserContext after HANDLE_REDIRECT_END and the msal instance has no accounts', () => {
    // * ARRANGE
    const eventType = EventType.HANDLE_REDIRECT_END;
    const userName = '';
    const payload = { account: { username: userName } };
    const eventMessage = { eventType, payload };

    msal.instance.getAllAccounts.mockReturnValue([]);

    msal.instance.addEventCallback.mockImplementation((callback) => {
      eventCallbacks.push(callback);
    });

    // * ACT
    render(getComponentToRender(defaultProps));
    act(() => invokeAllCallbacks(eventMessage));

    // * ASSERT
    expect(appInsights.setAuthenticatedUserContext).not.toHaveBeenCalled();
  });

  it('does not invoke setAuthenticatedUserContext if appInsights is null', () => {
    // * ARRANGE
    const eventType = EventType.LOGIN_SUCCESS;
    const userName = `${faker.person.firstName()} ${faker.person.lastName()}`;
    const payload = { account: { username: userName } };
    const eventMessage = { eventType, payload };

    msal.instance.addEventCallback.mockImplementation((callback) => {
      eventCallbacks.push(callback);
    });

    getAppInsights.mockReturnValue(null);

    // * ACT
    render(getComponentToRender(defaultProps));
    act(() => invokeAllCallbacks(eventMessage));

    // * ASSERT
    expect(appInsights.setAuthenticatedUserContext).not.toHaveBeenCalled();
  });

  it('does not invoke setAuthenticatedUserContext after an event that is not being watched', () => {
    // * ARRANGE
    const eventType = faker.string.alphanumeric(10);
    const userName = `${faker.person.firstName()} ${faker.person.lastName()}`;
    const payload = { account: { username: userName } };
    const eventMessage = { eventType, payload };

    msal.instance.addEventCallback.mockImplementation((callback) => {
      eventCallbacks.push(callback);
    });

    // * ACT
    render(getComponentToRender(defaultProps));
    act(() => invokeAllCallbacks(eventMessage));

    // * ASSERT
    expect(appInsights.setAuthenticatedUserContext).not.toHaveBeenCalled();
  });
});
