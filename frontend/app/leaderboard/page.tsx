'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../../lib/api';
import type { LeaderboardEntry } from '../types';

interface SocketMessage<T> {
    timestamp: string;
    data: T;
}

export default function LeaderboardPage() {
    const [rows, setRows] = useState<LeaderboardEntry[]>([]);
    const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);
    const [aroundRows, setAroundRows] = useState<LeaderboardEntry[]>([]);
    const [score, setScore] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [user, setUser] = useState<{ id: string; username: string } | null>(null);

    useEffect(() => {
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        void loadLeaderboard();
    }, []);

    useEffect(() => {
        if (!user) {
            setMyRank(null);
            setAroundRows([]);
            return;
        }

        void loadUserData(user.id);
    }, [user]);

    useEffect(() => {
        const socket = io(`${API_URL}/leaderboard`, {
            transports: ['websocket'],
        });

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));

        socket.on('leaderboard.updated', (message: SocketMessage<LeaderboardEntry[]>) => {
            setRows(message.data);
        });

        socket.on('score.updated', (message: SocketMessage<LeaderboardEntry>) => {
            const entry = message.data;
            setRows((currentRows) => {
                const existing = currentRows.find((row) => row.userId === entry.userId);
                if (existing) {
                    return currentRows.map((row) => (row.userId === entry.userId ? entry : row));
                }
                return [entry, ...currentRows].slice(0, 20);
            });

            if (user && entry.userId === user.id) {
                setMyRank(entry);
                void loadAroundMe(user.id);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user]);

    const loadLeaderboard = async () => {
        setError(null);
        try {
            const response = await fetch(`${API_URL}/leaderboard/top?limit=20`, {
                cache: 'no-store',
            });
            if (!response.ok) {
                throw new Error('Unable to load leaderboard');
            }
            const data = (await response.json()) as LeaderboardEntry[];
            setRows(data);
        } catch (err) {
            setError('Failed to load leaderboard. Please refresh the page.');
        }
    };

    const loadUserData = async (userId: string) => {
        await Promise.all([loadMyRank(userId), loadAroundMe(userId)]);
    };

    const loadMyRank = async (userId: string) => {
        try {
            const response = await fetch(`${API_URL}/leaderboard/rank/${userId}`, {
                cache: 'no-store',
            });
            if (!response.ok) {
                throw new Error('Unable to load your rank');
            }
            setMyRank((await response.json()) as LeaderboardEntry);
        } catch {
            setMyRank(null);
        }
    };

    const loadAroundMe = async (userId: string) => {
        try {
            const response = await fetch(`${API_URL}/leaderboard/around/${userId}?range=5`, {
                cache: 'no-store',
            });
            if (!response.ok) {
                throw new Error('Unable to load nearby scores');
            }
            setAroundRows((await response.json()) as LeaderboardEntry[]);
        } catch {
            setAroundRows([]);
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSuccess(null);
        setError(null);

        if (!user) {
            setError('Please log in to submit a score.');
            return;
        }

        const parsedScore = Number(score);
        if (!Number.isFinite(parsedScore) || parsedScore < 0) {
            setError('Please enter a valid non-negative score.');
            return;
        }

        setLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
            const response = await fetch(`${API_URL}/leaderboard/score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({ score: parsedScore }),
            });

            if (!response.ok) {
                throw new Error('Failed to submit score');
            }

            const updated = (await response.json()) as LeaderboardEntry;
            setSuccess('Score updated successfully.');
            setScore('');
            setMyRank(updated);
            void loadLeaderboard();
            if (user) {
                void loadAroundMe(user.id);
            }
        } catch {
            setError('Score submission failed. Please make sure you are logged in.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="page-card">
            <div className="page-header">
                <div>
                    <h2>Leaderboard</h2>
                    <p>{connected ? 'Live updates enabled' : 'Live updates disconnected'}</p>
                </div>
                {user ? <p>Logged in as <strong>{user.username}</strong></p> : <p>Please log in to submit your score.</p>}
            </div>

            {user ? (
                <form onSubmit={handleSubmit} className="form-card">
                    <label>
                        Submit Score
                        <input
                            type="number"
                            min="0"
                            value={score}
                            onChange={(event) => setScore(event.target.value)}
                            placeholder="Enter your score"
                            required
                        />
                    </label>
                    <button type="submit" disabled={loading}>
                        {loading ? 'Submitting...' : 'Submit Score'}
                    </button>
                    {success ? <p className="success-text">{success}</p> : null}
                    {error ? <p className="error-text">{error}</p> : null}
                </form>
            ) : null}

            {myRank ? (
                <section className="page-card">
                    <h3>Your Rank</h3>
                    <p>
                        <strong>{myRank.username ?? user?.username ?? myRank.userId}</strong> — Rank <strong>{myRank.rank}</strong> — Score <strong>{myRank.score}</strong>
                    </p>
                </section>
            ) : null}

            {aroundRows.length > 0 ? (
                <section className="page-card">
                    <h3>Players Around You</h3>
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Username</th>
                                <th>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aroundRows.map((entry) => (
                                <tr key={entry.userId}>
                                    <td>{entry.rank}</td>
                                    <td>{entry.username ?? entry.userId}</td>
                                    <td>{entry.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            ) : null}

            <section className="page-card">
                <h3>Top Leaderboard</h3>
                <div className="leaderboard-table-wrapper">
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Username</th>
                                <th>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={3}>No leaderboard entries found.</td>
                                </tr>
                            ) : (
                                rows.map((entry) => (
                                    <tr key={entry.userId}>
                                        <td>{entry.rank}</td>
                                        <td>{entry.username ?? entry.userId}</td>
                                        <td>{entry.score}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </section>
    );
}
