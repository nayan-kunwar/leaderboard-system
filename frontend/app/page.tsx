import Link from 'next/link';

export default function Home() {
  return (
    <section className="page-card">
      <h2>Welcome to the Leaderboard</h2>
      <p>
        This frontend connects to your Nest backend at <strong>http://localhost:3000</strong>.
      </p>
      <div className="cards">
        <Link href="/login" className="card">
          <h3>Login</h3>
          <p>Authenticate and get a JWT token.</p>
        </Link>
        <Link href="/register" className="card">
          <h3>Register</h3>
          <p>Create a new user account for the leaderboard.</p>
        </Link>
        <Link href="/leaderboard" className="card">
          <h3>Leaderboard</h3>
          <p>View the top users and scores.</p>
        </Link>
      </div>
    </section>
  );
}
