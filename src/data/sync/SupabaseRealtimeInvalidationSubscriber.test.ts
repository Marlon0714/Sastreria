import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { SupabaseRealtimeInvalidationSubscriber } from "./SupabaseRealtimeInvalidationSubscriber";

type EventCallback = () => void;

const callbacks: EventCallback[] = [];
const mockOn = jest.fn();
const mockSubscribe = jest.fn();
const mockRemoveChannel = jest.fn(async () => Promise.resolve());
const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
};

jest.mock("../supabase/client", () => ({
  getSupabaseClient: () => ({
    channel: () => mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));

describe("SupabaseRealtimeInvalidationSubscriber", () => {
  beforeEach(() => {
    callbacks.length = 0;
    mockOn.mockReset();
    mockSubscribe.mockReset();
    mockRemoveChannel.mockClear();
    jest.useFakeTimers();

    mockOn.mockImplementation(
      (_event: unknown, _filter: unknown, callback: unknown) => {
        const eventCallback = callback as EventCallback;
        callbacks.push(eventCallback);
        return mockChannel;
      },
    );
    mockSubscribe.mockReturnValue(mockChannel);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("subscribes to all sync tables and coalesces burst events", async () => {
    const onInvalidation = jest.fn();
    const subscriber = new SupabaseRealtimeInvalidationSubscriber(
      onInvalidation,
      300,
    );

    subscriber.start();

    expect(mockOn).toHaveBeenCalledTimes(4);
    callbacks[0]?.();
    callbacks[1]?.();
    callbacks[2]?.();

    expect(onInvalidation).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(300);
    expect(onInvalidation).toHaveBeenCalledTimes(1);
  });

  it("is idempotent on repeated start and supports stop", async () => {
    const subscriber = new SupabaseRealtimeInvalidationSubscriber(() => {
      return;
    });

    subscriber.start();
    subscriber.start();

    expect(mockSubscribe).toHaveBeenCalledTimes(1);

    await subscriber.stop();
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("clears pending debounce callback on stop", async () => {
    // Arrange
    const onInvalidation = jest.fn();
    const subscriber = new SupabaseRealtimeInvalidationSubscriber(
      onInvalidation,
      300,
    );

    // Act
    subscriber.start();
    callbacks[0]?.();
    await subscriber.stop();
    await jest.advanceTimersByTimeAsync(300);

    // Assert
    expect(onInvalidation).not.toHaveBeenCalled();
  });

  it("supports stop before start", async () => {
    // Arrange
    const subscriber = new SupabaseRealtimeInvalidationSubscriber(() => {
      return;
    });

    // Act
    await subscriber.stop();

    // Assert
    expect(mockRemoveChannel).not.toHaveBeenCalled();
  });
});
