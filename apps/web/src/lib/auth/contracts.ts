import { z } from "zod";

export const fighterRegistrationRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(10),
    adultAttestation: z.boolean(),
  })
  .refine((v) => v.adultAttestation === true, {
    path: ["adultAttestation"],
    message: "You must confirm you are 18+ to register as a fighter.",
  });

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const passwordResetCompleteRequestSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(10),
});

export const adminProvisionUserRequestSchema = z.discriminatedUnion("provisionMode", [
  z.object({
    provisionMode: z.literal("direct_active"),
    email: z.string().email(),
    initialPassword: z.string().min(10),
  }),
  z.object({
    provisionMode: z.literal("email_invitation"),
    email: z.string().email(),
  }),
]);

export const fighterProfilePatchSchema = z.object({
  displayName: z.string().min(1).optional(),
  ringName: z.string().nullable().optional(),
  visibility: z.record(z.object({ public: z.boolean() })).optional(),
});

export const roleMutationBodySchema = z.object({
  operationalRoleKey: z.string().min(1),
});
