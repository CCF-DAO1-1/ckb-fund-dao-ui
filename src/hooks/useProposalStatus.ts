import { useState, useEffect } from 'react';
import { getProposalStatus, ProposalStatusResponse } from '@/server/proposal';
import { logger } from '@/lib/logger';

interface UseProposalStatusResult {
    data: ProposalStatusResponse | null;
    loading: boolean;
    error: Error | null;
}

export function useProposalStatus(): UseProposalStatusResult {
    const [data, setData] = useState<ProposalStatusResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                setLoading(true);
                console.log('Fetching proposal status...');
                const response = await getProposalStatus({});
                console.log('Proposal status response:', response);
                setData(response);
            } catch (err) {
                console.error('Failed to fetch proposal status', err);
                logger.error('Failed to fetch proposal status', err);
                setError(err instanceof Error ? err : new Error('Failed to fetch status'));
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
    }, []);

    return { data, loading, error };
}
