'use server'

import { assertNonNullable } from "@/libs/assert";
import { revalidateTag } from "next/cache";
import { prisma } from "../../../../prisma/client";

export default async function handleUpdateUserName(data: FormData) {
    const newName = data.get("name");
    assertNonNullable(newName);
    await prisma.user.update({
        where: { id: 1 },
        data: { name: newName.toString() },
      });
    revalidateTag("user");
}