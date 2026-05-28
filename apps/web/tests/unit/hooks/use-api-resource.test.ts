// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiClientErrorException } from "@/lib/api/client";
import { useApiResource } from "@/hooks/use-api-resource";

describe("useApiResource", () => {
  it("loads data on mount and clears loading", async () => {
    const loader = vi.fn().mockResolvedValue({ items: [1] });
    const { result } = renderHook(() =>
      useApiResource({ resourceKey: "a", loader }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ items: [1] });
    expect(result.current.error).toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("reload refetches data", async () => {
    let count = 0;
    const loader = vi.fn().mockImplementation(async () => ({ count: ++count }));
    const { result } = renderHook(() =>
      useApiResource({ resourceKey: "b", loader }),
    );

    await waitFor(() => expect(result.current.data?.count).toBe(1));
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.data?.count).toBe(2);
  });

  it("runMutation reloads once on success", async () => {
    const loader = vi.fn().mockResolvedValue({ n: 1 });
    const { result } = renderHook(() =>
      useApiResource({ resourceKey: "c", loader }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    const mutation = vi.fn().mockResolvedValue({ ok: true });
    await act(async () => {
      await result.current.runMutation(mutation);
    });

    expect(mutation).toHaveBeenCalledTimes(1);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });

  it("runMutation sets error and skips reload on failure", async () => {
    const loader = vi.fn().mockResolvedValue({ n: 1 });
    const { result } = renderHook(() =>
      useApiResource({ resourceKey: "d", loader }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    const callsBefore = loader.mock.calls.length;
    await act(async () => {
      const out = await result.current.runMutation(() =>
        Promise.reject(
          new ApiClientErrorException({
            httpStatus: 400,
            code: "bad",
            userMessage: "Mutation failed",
          }),
        ),
      );
      expect(out).toBeNull();
    });

    expect(result.current.error).toBe("Mutation failed");
    expect(loader.mock.calls.length).toBe(callsBefore);
  });

  it("resets when resourceKey changes", async () => {
    const loader = vi
      .fn()
      .mockImplementation(async (key?: string) => ({ key: key ?? "default" }));
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) =>
        useApiResource({
          resourceKey: key,
          loader: () => loader(key),
        }),
      { initialProps: { key: "one" } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ key: "two" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(loader).toHaveBeenCalledWith("two");
  });
});
