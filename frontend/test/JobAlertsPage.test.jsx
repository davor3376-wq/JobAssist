import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import JobAlertsPage from "../src/pages/JobAlertsPage.jsx";
import { createTestQueryClient, renderWithProviders } from "./render.jsx";

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockRunNow = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();

vi.mock("../src/services/api", () => ({
  jobAlertsApi: {
    list: (...args) => mockList(...args),
    create: (...args) => mockCreate(...args),
    update: (...args) => mockUpdate(...args),
    delete: (...args) => mockDelete(...args),
    runNow: (...args) => mockRunNow(...args),
  },
}));

vi.mock("../src/hooks/useUsageGuard", () => ({
  default: () => ({
    guardedRun: (fn) => fn(),
  }),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: (...args) => mockSuccess(...args),
    error: (...args) => mockError(...args),
  },
}));

describe("JobAlertsPage", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
    mockRunNow.mockReset();
    mockSuccess.mockReset();
    mockError.mockReset();
  });

  it("creates a new alert and bumps cached usage", async () => {
    mockList.mockResolvedValue({
      data: [
        {
          id: 1,
          keywords: "python",
          location: "Wien",
          job_type: "Full-time",
          email: "user@example.com",
          frequency: "daily",
          is_active: true,
          created_at: "2026-03-26T10:00:00.000Z",
          updated_at: "2026-03-26T10:00:00.000Z",
          last_sent_at: null,
        },
      ],
    });
    mockCreate.mockResolvedValue({
      data: {
        id: 2,
        keywords: "golang",
        location: "Graz",
        job_type: "Part-time",
        email: "user@example.com",
        frequency: "weekly",
        is_active: true,
        created_at: "2026-03-26T11:00:00.000Z",
        updated_at: "2026-03-26T11:00:00.000Z",
        last_sent_at: null,
      },
    });

    const queryClient = createTestQueryClient();
    const initData = {
      me: {
        email: "user@example.com",
        alert_refresh_count: 1,
        alert_refresh_window_start: "2026-03-26T09:00:00.000Z",
      },
      usage: [{ feature: "job_alerts", used: 1, limit: 2, remaining: 1 }],
    };
    const billingData = {
      usage: [{ feature: "job_alerts", used: 1, limit: 2, remaining: 1 }],
    };
    queryClient.setQueryDefaults(["init"], { queryFn: async () => initData });
    queryClient.setQueryDefaults(["billing-overview"], { queryFn: async () => billingData });
    queryClient.setQueryData(["init"], initData);
    queryClient.setQueryData(["billing-overview"], billingData);

    renderWithProviders(<JobAlertsPage />, { queryClient });

    expect(await screen.findByText("python")).toBeInTheDocument();
    expect(screen.getByText("2 Aktualisierungen heute (alle 4h)")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Neuer Alert/i }));
    const textboxes = screen.getAllByRole("textbox");
    await userEvent.type(textboxes[0], "golang");
    await userEvent.type(textboxes[1], "Graz");
    await userEvent.click(screen.getByRole("radio", { name: "Wöchentlich" }));
    await userEvent.click(screen.getByRole("button", { name: "Alert erstellen" }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      keywords: "golang",
      location: "Graz",
      frequency: "weekly",
    });

    expect(await screen.findByText("golang")).toBeInTheDocument();
    expect(mockSuccess).toHaveBeenCalledWith("Alert erstellt!");
    expect(queryClient.getQueryData(["init"]).usage[0]).toMatchObject({ used: 2, remaining: 0 });
  });
});
