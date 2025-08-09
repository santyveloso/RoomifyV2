import { getSession } from "next-auth/react";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default function HouseDashboard({ house }) {
  return (
    <>
      <h1>{house.name}</h1>
      <h2>Members</h2>
      <ul>
        {house.memberships.map((membership) => (
          <li key={membership.id}>
            {membership.user.name} ({membership.role})
          </li>
        ))}
      </ul>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  const { id } = context.params;

  const house = await prisma.house.findUnique({
    where: { id: String(id) },
    include: { memberships: { include: { user: true } } },
  });

  if (!house) {
    return {
      notFound: true,
    };
  }

  const isMember = house.memberships.some(
    (membership) => membership.userId === session.user.id
  );

  if (!isMember) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  return {
    props: { house },
  };
}
