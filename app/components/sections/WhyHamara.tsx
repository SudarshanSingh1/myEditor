import { motion } from "framer-motion";
import { Container } from "../layout/Container";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

const usageData = [
  { name: "Mon", value: 120 },
  { name: "Tue", value: 250 },
  { name: "Wed", value: 180 },
  { name: "Thu", value: 390 },
  { name: "Fri", value: 290 },
  { name: "Sat", value: 450 },
  { name: "Sun", value: 380 },
];

const languageData = [
  { name: "TypeScript", value: 350, color: "#3178C6" },
  { name: "Python", value: 320, color: "#3572A5" },
  { name: "JavaScript", value: 250, color: "#f1e05a" },
  { name: "C++", value: 180, color: "#f34b7d" },
  { name: "Rust", value: 150, color: "#dea584" },
  { name: "Go", value: 130, color: "#00ADD8" },
  { name: "Java", value: 120, color: "#b07219" },
];

const featureData = [
  { name: "Custom Terminal", used: 92 },
  { name: "Keyboard Shortcuts", used: 85 },
  { name: "Custom Themes", used: 78 },
  { name: "Extensions", used: 65 },
];

export function WhyHamara() {
  return (
    <section id="analytics" className="py-20 bg-muted/30">
      <Container>
        <div className="flex flex-col items-center text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
              Powerful Analytics & Insights
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Monitor your projects, track your productivity, and visualize your code metrics in real-time.
            </p>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Area Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 border rounded-xl bg-card p-6 shadow-sm"
          >
            <h3 className="font-semibold mb-6">Execution Requests Over Time</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <div className="flex flex-col gap-8">
            {/* Pie Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="border rounded-xl bg-card p-6 shadow-sm flex-1"
            >
              <h3 className="font-semibold mb-4">Language Distribution</h3>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={languageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {languageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="border rounded-xl bg-card p-6 shadow-sm flex-1"
            >
              <h3 className="font-semibold mb-4">Feature Adoption (%)</h3>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureData} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <Bar dataKey="used" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
