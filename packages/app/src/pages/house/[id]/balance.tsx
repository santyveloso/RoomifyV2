import { getSession } from "next-auth/react";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default function Balance({ house, balances }) {
  return (
    <>
      <h1>Balances for {house.name}</h1>
      <ul>
        {Object.entries(balances).map(([name, balance]) => (
          <li key={name}>
            {name}: {balance}
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
    include: { memberships: true },
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

  const res = await fetch(`http://localhost:3000/api/houses/${id}/balance`, {
    headers: {
      cookie: context.req.headers.cookie,
    },
  });
  const balances = await res.json();

  return {
    props: { house, balances },
  };
}
