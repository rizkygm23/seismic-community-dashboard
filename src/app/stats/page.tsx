import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Statistics | Seismic Community Dashboard',
    description: 'Community statistics are available in the unified dashboard index.',
};

export default function StatsPage() {
    redirect('/#statistics');
}
