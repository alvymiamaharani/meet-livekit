'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, update, off } from 'firebase/database';
import { rtdb } from '@/lib/firebase';

interface UserTestData {
  subtest: number;
  isPaused: boolean;
}

interface UsersData {
  [key: string]: UserTestData;
}

interface TableEntry {
  key: string;
  date: string;
  uid: string;
  subtest: number;
  isPaused: boolean;
}

const AdminDashboard: React.FC = () => {
  const [usersData, setUsersData] = useState<UsersData>({});
  const [tableData, setTableData] = useState<TableEntry[]>([]);

  const getTodayString = (): string => {
    return new Date().toISOString().split('T')[0]; // e.g., '2025-07-16'
  };
  const today = getTodayString();

  useEffect(() => {
    const testMonitoringRef = ref(rtdb, 'test-monitoring');

    onValue(testMonitoringRef, (snapshot) => {
      const data: UsersData | null = snapshot.val();
      if (data) {
        const formattedData: TableEntry[] = Object.entries(data)
          .map(([key, value]) => {
            const match = key.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
            const date = match ? match[1] : 'Unknown';
            const uid = match ? match[2] : key;

            return {
              key,
              date,
              uid,
              subtest: value.subtest || 0,
              isPaused: value.isPaused || false,
            };
          })
          .filter((entry) => entry.date === today);
        setTableData(formattedData);
        setUsersData(data);
      } else {
        setTableData([]);
        setUsersData({});
      }
    });

    return () => {
      off(testMonitoringRef);
    };
  }, [today]);

  const togglePause = (key: string, currentIsPaused: boolean): void => {
    const path = `test-monitoring/${key}`;
    update(ref(rtdb, path), {
      isPaused: !currentIsPaused,
    }).catch((error: unknown) => {
      console.error('Error updating pause status:', error);
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f0f0', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '24px' }}>
          Admin Dashboard - Monitor Ujian
        </h1>
        <div
          style={{
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px' }}>
            <h2
              style={{ fontSize: '18px', fontWeight: '600', color: '#444', marginBottom: '16px' }}
            >
              Daftar Pengguna yang Sedang Ujian (Hari Ini: {today})
            </h2>
            {tableData.length === 0 ? (
              <p style={{ color: '#666' }}>Tidak ada pengguna yang sedang ujian hari ini.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f7f7f7' }}>
                    <tr>
                      <th
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#555',
                          textTransform: 'uppercase',
                        }}
                      >
                        Tanggal
                      </th>
                      <th
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#555',
                          textTransform: 'uppercase',
                        }}
                      >
                        UID
                      </th>
                      <th
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#555',
                          textTransform: 'uppercase',
                        }}
                      >
                        Subtest
                      </th>
                      <th
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#555',
                          textTransform: 'uppercase',
                        }}
                      >
                        Status
                      </th>
                      <th
                        style={{
                          padding: '12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#555',
                          textTransform: 'uppercase',
                        }}
                      >
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody style={{ borderTop: '1px solid #e5e5e5' }}>
                    {tableData.map((entry) => (
                      <tr key={entry.key} style={{ borderBottom: '1px solid #e5e5e5' }}>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                          {entry.date}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                          {entry.uid}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                          {entry.subtest}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#333' }}>
                          {entry.isPaused ? (
                            <span
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                borderRadius: '12px',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                              }}
                            >
                              Paused
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                fontWeight: '600',
                                borderRadius: '12px',
                                backgroundColor: '#d1fae5',
                                color: '#16a34a',
                              }}
                            >
                              Active
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          <button
                            onClick={() => togglePause(entry.key, entry.isPaused)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '6px',
                              color: '#fff',
                              fontWeight: '500',
                              backgroundColor: entry.isPaused ? '#16a34a' : '#dc2626',
                              cursor: 'pointer',
                              border: 'none',
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = entry.isPaused
                                ? '#15803d'
                                : '#b91c1c';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = entry.isPaused
                                ? '#16a34a'
                                : '#dc2626';
                            }}
                          >
                            {entry.isPaused ? 'Continue' : 'Pause'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
