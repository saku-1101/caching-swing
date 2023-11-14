import { prisma } from "./client";

async function main() {
  await prisma.user.upsert({
    where: { email: "example@mail.com" },
    update: {},
    create: {
      email: "example@mail.com",
      name: "Example",
    },
  });
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
