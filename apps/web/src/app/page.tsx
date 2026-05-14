import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>FAC-App</h1>
      <p>Foundation slice: identity, roles, and audit.</p>
      <ul>
        <li>
          <Link href="/register/fighter">Fighter registration</Link>
        </li>
        <li>
          <Link href="/login">Sign in</Link>
        </li>
        <li>
          <Link href="/me">Account home</Link>
        </li>
        <li>
          <Link href="/admin/users">Admin — users</Link>
        </li>
      </ul>
    </main>
  );
}
