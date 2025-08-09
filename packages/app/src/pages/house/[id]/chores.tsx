import { getSession } from "next-auth/react";
import { PrismaClient } from "@prisma/client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import { GetServerSidePropsContext } from "next";

const prisma = new PrismaClient();

interface User {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  userId: string;
  dueDate: string;
  user: User;
}

interface Chore {
  id: string;
  title: string;
  description: string;
  assignments: Assignment[];
}

interface House {
  id: string;
  name: string;
  memberships: {
    userId: string;
  }[];
}

interface ChoresProps {
  house: House;
  chores: Chore[];
}

export default function Chores({ house, chores }: ChoresProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const res = await fetch(`/api/houses/${house.id}/chores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, description }),
    });

    if (res.ok) {
      router.replace(router.asPath);
    }
  };

  return (
    <>
      <h1>Chores for {house.name}</h1>
      <h2>Add a new chore</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button type="submit">Add chore</button>
      </form>
      <h2>All chores</h2>
      <ul>
        {chores.map((chore) => (
          <li key={chore.id}>
            <h3>{chore.title}</h3>
            <p>{chore.description}</p>
            <h4>Assignments</h4>
            <ul>
              {chore.assignments.map((assignment) => (
                <li key={assignment.id}>
                  {assignment.user.name} - {assignment.dueDate}
                </li>
              ))}
            </ul>
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

  const chores = await prisma.chore.findMany({
    where: { houseId: String(id) },
    include: { assignments: { include: { user: true } } },
  });

  return {
    props: { house, chores: JSON.parse(JSON.stringify(chores)) },
  };
}
