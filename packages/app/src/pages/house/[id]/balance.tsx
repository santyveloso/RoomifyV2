import { getSession } from "next-auth/react";
import { PrismaClient } from "@prisma/client";
import { GetServerSidePropsContext } from "next";

const prisma = new PrismaClient();

interface House {
  id: string;
  name: string;
  memberships: {
    userId: string;
  }[];
}

interface BalanceProps {
  house: House;
  balances: Record<string, number>;
}

export default function Balance({ house, balances }: BalanceProps) {
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

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getSession(context);
  const { id } = context.params || {};

  if (!session?.user) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  // Get the user ID from session
  const userId = (session.user as { id: string }).id;
  
  if (!userId) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

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
    (membership) => membership.userId === userId
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
      cookie: context.req.headers.cookie || "",
    },
  });
  const balances = await res.json();

  return {
    props: { house, balances },
  };
}
