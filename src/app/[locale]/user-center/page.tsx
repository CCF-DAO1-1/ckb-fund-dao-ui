'use client';

import { useState } from 'react';
import UserProfileCard from '../../../components/user-center/UserProfileCard';
import '@/components/user-center/UserCenter.css';
import '@/components/treasury/task-modal.css';
import Web5IdentityCard from '@/components/user-center/Web5IdentityCard';
import WalletDaoCard from '@/components/user-center/WalletDaoCard';
import RecordsTable from '@/components/user-center/RecordsTable';
// import RecordsTable from '@/components/user-center/RecordsTable';



export default function UserCenter() {
  const [activeTab, setActiveTab] = useState('proposals');

  return (
    <div className="user-center-container">
      <main className="user-center-main">
        {/* 顶部卡片行 */}
        <div className="user-center-cards">
          <UserProfileCard />
          <Web5IdentityCard />
          <WalletDaoCard />
        </div>

        {/* 记录表格 */}
        <div className="user-center-records">
          
          <RecordsTable activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </main>
    </div>
  );
}
