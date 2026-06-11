import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

export function HospitalComparisonTable({ comparison = [] }) {
  if (!comparison.length) return null;

  return (
    <Card>
      <CardHeader><CardTitle>Hospital Comparison</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b dark:border-slate-700">
              <th className="py-2 text-left">Hospital</th>
              <th className="py-2 text-left">Rating</th>
              <th className="py-2 text-left">Beds</th>
              <th className="py-2 text-left">Departments</th>
              <th className="py-2 text-left">Emergency</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((row) => (
              <tr key={row.hospital._id} className="border-b dark:border-slate-800">
                <td className="py-3 font-medium">{row.hospital.name}</td>
                <td>{row.hospital.rating}</td>
                <td>{row.beds?.generalAvailable ?? row.hospital.availableBeds}/{row.beds?.generalBeds ?? row.hospital.totalBeds}</td>
                <td>{row.departmentCount}</td>
                <td>{row.hospital.emergencyAvailable ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
