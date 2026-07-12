import { beforeEach, describe, expect, it, vi } from "vitest";

import { ACCOUNT_DELETION_CONFIRMATION } from "@/lib/auth/account-deletion-shared";
import { initialAuthFormState } from "@/lib/auth/validation";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  getUser: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth/session", () => ({
  getUser: mocks.getUser,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { deleteAccountAction } from "@/lib/auth/account-deletion";

const okResult = { error: null };

function formWithConfirmation(value: string): FormData {
  const formData = new FormData();
  formData.set("confirmation", value);
  return formData;
}

function profileSelectBuilder(result: {
  data: { avatar_url: string | null } | null;
  error: null | { message: string };
}) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
  };
  return builder;
}

function mutationBuilder(result: { error: null | { message: string } } = okResult) {
  const builder = {
    payload: undefined as unknown,
    delete: vi.fn(() => builder),
    update: vi.fn((payload: unknown) => {
      builder.payload = payload;
      return builder;
    }),
    eq: vi.fn(async () => result),
  };
  return builder;
}

function makeAdminClient(
  builders: unknown[],
  options: {
    avatarRemoveResult?: { error: null | { message: string } };
    deleteUserResult?: { error: null | { message: string } };
  } = {},
) {
  const queue = [...builders];
  const remove = vi.fn(async () => options.avatarRemoveResult ?? okResult);
  const deleteUser = vi.fn(async () => options.deleteUserResult ?? okResult);

  return {
    from: vi.fn(() => {
      const next = queue.shift();
      if (!next) throw new Error("Unexpected Supabase table access");
      return next;
    }),
    storage: {
      from: vi.fn(() => ({ remove })),
    },
    auth: {
      admin: { deleteUser },
    },
    remove,
    deleteUser,
  };
}

describe("deleteAccountAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ auth: { signOut: vi.fn(async () => okResult) } });
  });

  it("requires the exact confirmation phrase", async () => {
    const result = await deleteAccountAction(initialAuthFormState, formWithConfirmation("delete"));

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.confirmation?.[0]).toContain(ACCOUNT_DELETION_CONFIRMATION);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects signed-out deletion attempts", async () => {
    mocks.getUser.mockResolvedValue(null);

    const result = await deleteAccountAction(
      initialAuthFormState,
      formWithConfirmation(ACCOUNT_DELETION_CONFIRMATION),
    );

    expect(result).toEqual({ status: "error", message: "Sign in before deleting your account." });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("does not delete the Auth user when reader-data cleanup fails", async () => {
    mocks.getUser.mockResolvedValue({ id: "user-1", email: "reader@example.com" });

    const admin = makeAdminClient([
      profileSelectBuilder({ data: { avatar_url: null }, error: null }),
      mutationBuilder(),
      mutationBuilder({ error: { message: "bookmarks unavailable" } }),
    ]);
    mocks.createAdminClient.mockReturnValue(admin);

    const result = await deleteAccountAction(
      initialAuthFormState,
      formWithConfirmation(ACCOUNT_DELETION_CONFIRMATION),
    );

    expect(result.status).toBe("error");
    expect(admin.deleteUser).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("reports an error if Auth deletion fails after data cleanup", async () => {
    mocks.getUser.mockResolvedValue({ id: "user-1", email: null });

    const admin = makeAdminClient(
      [
        profileSelectBuilder({ data: { avatar_url: null }, error: null }),
        mutationBuilder(),
        mutationBuilder(),
        mutationBuilder(),
        mutationBuilder(),
        mutationBuilder(),
      ],
      { deleteUserResult: { error: { message: "auth unavailable" } } },
    );
    mocks.createAdminClient.mockReturnValue(admin);

    const result = await deleteAccountAction(
      initialAuthFormState,
      formWithConfirmation(ACCOUNT_DELETION_CONFIRMATION),
    );

    expect(result.status).toBe("error");
    expect(admin.deleteUser).toHaveBeenCalledWith("user-1");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("deletes reader data, removes owned avatar storage, deletes Auth user and signs out", async () => {
    mocks.getUser.mockResolvedValue({ id: "user-1", email: "Reader@Example.com" });
    const signOut = vi.fn(async () => okResult);
    mocks.createClient.mockResolvedValue({ auth: { signOut } });

    const commentDelete = mutationBuilder();
    const admin = makeAdminClient([
      profileSelectBuilder({
        data: {
          avatar_url:
            "https://example.supabase.co/storage/v1/object/public/profiles/avatars/user-1-avatar.png",
        },
        error: null,
      }),
      mutationBuilder(),
      mutationBuilder(),
      commentDelete,
      mutationBuilder(),
      mutationBuilder(),
      mutationBuilder(),
    ]);
    mocks.createAdminClient.mockReturnValue(admin);

    const result = await deleteAccountAction(
      initialAuthFormState,
      formWithConfirmation(ACCOUNT_DELETION_CONFIRMATION),
    );

    expect(result.status).toBe("success");
    expect(admin.remove).toHaveBeenCalledWith(["avatars/user-1-avatar.png"]);
    expect(commentDelete.payload).toEqual({
      status: "deleted",
      body: "",
      reported_by: null,
      report_reason: null,
    });
    expect(admin.deleteUser).toHaveBeenCalledWith("user-1");
    expect(signOut).toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/account/profile");
  });
});
