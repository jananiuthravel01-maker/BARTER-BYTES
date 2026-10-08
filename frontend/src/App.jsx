import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

const roleNames = {
  payroll: "Payroll",
  developer: "Developer",
  hr: "HR",
  executive: "Executive",
};

const roleTraining = {
  payroll: "Invoice & Payment Fraud",
  developer: "Credential & Repository Security",
  hr: "Employee Data Protection",
  executive: "Executive Spear-Phishing Awareness",
};

const quizQuestions = [
  {
    question:
      "What should you do when an unexpected email asks you to click a link?",
    options: [
      "Click immediately",
      "Verify the sender and link first",
      "Forward it to everyone",
      "Ignore all security warnings",
    ],
    answer: 1,
  },
  {
    question: "Which is a common phishing warning sign?",
    options: [
      "Unexpected urgency",
      "A normal internal announcement",
      "A scheduled meeting",
      "A known company notification",
    ],
    answer: 0,
  },
  {
    question: "If you suspect a phishing message, what is the safest action?",
    options: [
      "Reply with your password",
      "Click the link to investigate",
      "Report it through the approved security process",
      "Send it to friends",
    ],
    answer: 2,
  },
];

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [role, setRole] = useState("developer");
  const [difficulty, setDifficulty] = useState("medium");
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [trainingDone, setTrainingDone] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [dashboardRes, employeesRes] = await Promise.all([
        fetch(`${API}/dashboard`),
        fetch(`${API}/employees`),
      ]);

      const dashboardData = await dashboardRes.json();
      const employeesData = await employeesRes.json();

      setDashboard(dashboardData);
      setEmployees(employeesData);

      const trainingResults = [];

      for (const employee of employeesData) {
        try {
          const response = await fetch(`${API}/trainings/${employee.id}`);
          const data = await response.json();

          if (Array.isArray(data)) {
            trainingResults.push(...data);
          } else if (data.trainings) {
            trainingResults.push(...data.trainings);
          }
        } catch {
          // Continue
        }
      }

      setTrainings(trainingResults);
    } catch (error) {
      console.error(error);
      setMessage("Backend connection error");
    }
  }

  async function launchCampaign() {
    setLoading(true);
    setLinks([]);
    setMessage("");

    try {
      const response = await fetch(`${API}/campaigns/launch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_role: role,
          difficulty,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Campaign launch failed");
      }

      setLinks(data.simulation_urls || data.links || []);
      setMessage("Simulation launched successfully.");

      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Campaign launch failed. Check the backend.");
    } finally {
      setLoading(false);
    }
  }

  function startTraining(training) {
    setSelectedTraining(training);
    setAnswers({});
    setScore(null);
    setTrainingDone(false);

    setTimeout(() => {
      document
        .getElementById("training-quiz")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function submitQuiz() {
    let correct = 0;

    quizQuestions.forEach((question, index) => {
      if (answers[index] === question.answer) {
        correct++;
      }
    });

    setScore(Math.round((correct / quizQuestions.length) * 100));
  }

  async function completeTraining() {
    if (!selectedTraining || score === null) return;

    try {
      const response = await fetch(
        `${API}/trainings/${selectedTraining.id}/complete?score=${score}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Training completion failed");
      }

      setTrainingDone(true);
      setMessage("Training completed successfully.");
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Could not complete training.");
    }
  }

  const remediationEmployees = employees.filter(
    (employee) => employee.status === "remediation"
  );

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>CyberShield</h1>
          <p>Adaptive Human Threat Defense Platform</p>
        </div>

        <div className="security-badge">
          ● SECURITY OPERATIONS
        </div>
      </header>

      <main className="container">
        <section className="hero-section">
          <p className="eyebrow">SECURITY OPERATIONS CENTER</p>

          <h2>Human Vulnerability Dashboard</h2>

          <p>
            Simulate targeted threats, measure employee behavior,
            and automatically assign security training.
          </p>
        </section>

        {message && <div className="message">{message}</div>}

        <section className="stats-grid">
          <div className="stat-card">
            <span>Employees</span>
            <strong>{dashboard?.employees ?? 0}</strong>
          </div>

          <div className="stat-card">
            <span>Campaigns</span>
            <strong>{dashboard?.campaigns ?? 0}</strong>
          </div>

          <div className="stat-card">
            <span>Simulations Sent</span>
            <strong>{dashboard?.simulations_sent ?? 0}</strong>
          </div>

          <div className="stat-card">
            <span>Clicks</span>
            <strong>{dashboard?.clicks ?? 0}</strong>
          </div>

          <div className="stat-card risk">
            <span>Risk Index</span>
            <strong>{dashboard?.risk_index ?? 0}%</strong>
          </div>

          <div className="stat-card danger">
            <span>Remediation</span>
            <strong>{dashboard?.remediation_required ?? 0}</strong>
          </div>
        </section>

        <section className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">MODULE 01</p>
              <h2>Campaign Console</h2>
            </div>

            <span className="status-pill">SAFE SIMULATION</span>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Target Role</label>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="payroll">Payroll</option>
                <option value="developer">Developer</option>
                <option value="hr">HR</option>
                <option value="executive">Executive</option>
              </select>
            </div>

            <div className="form-group">
              <label>Difficulty</label>

              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="template-preview">
            <span>ROLE-BASED TRAINING TARGET</span>
            <strong>{roleTraining[role]}</strong>
          </div>

          <button
            className="primary-button"
            onClick={launchCampaign}
            disabled={loading}
          >
            {loading ? "LAUNCHING..." : "LAUNCH SIMULATION →"}
          </button>
        </section>

        {links.length > 0 && (
          <section className="panel">
            <div className="section-title">
              <div>
                <p className="eyebrow">MODULE 02</p>
                <h2>Generated Simulation Links</h2>
              </div>
            </div>

            <p className="muted">
              Safe mock simulations. No real credentials are collected.
            </p>

            <div className="link-list">
              {links.map((link, index) => {
                const url =
                  typeof link === "string"
                    ? link
                    : link.url || link.simulation_url;

                return (
                  <div className="simulation-link" key={index}>
                    <span>Simulation {index + 1}</span>

                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      OPEN SIMULATION →
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">MODULE 03</p>
              <h2>Employees Requiring Remediation</h2>
            </div>
          </div>

          {remediationEmployees.length === 0 ? (
            <div className="empty-state">
              No employees currently require remediation.
            </div>
          ) : (
            <div className="employee-list">
              {remediationEmployees.map((employee) => {
                const employeeTraining = trainings.find(
                  (training) =>
                    training.employee_id === employee.id &&
                    training.status !== "completed"
                );

                return (
                  <div className="employee-card" key={employee.id}>
                    <div>
                      <h3>{employee.name}</h3>
                      <p>{employee.email}</p>
                      <span>
                        Role:{" "}
                        {roleNames[employee.role] || employee.role}
                      </span>
                    </div>

                    <div className="risk-score">
                      <strong>{employee.risk_score}%</strong>
                      <small>Risk Score</small>
                    </div>

                    {employeeTraining && (
                      <button
                        className="secondary-button"
                        onClick={() =>
                          startTraining(employeeTraining)
                        }
                      >
                        START TRAINING
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="section-title">
            <div>
              <p className="eyebrow">MODULE 04</p>
              <h2>Training Center</h2>
            </div>
          </div>

          {trainings.filter(
            (training) => training.status !== "completed"
          ).length === 0 ? (
            <div className="empty-state">
              No pending training modules.
            </div>
          ) : (
            <div className="training-grid">
              {trainings
                .filter(
                  (training) => training.status !== "completed"
                )
                .map((training) => {
                  const employee = employees.find(
                    (item) => item.id === training.employee_id
                  );

                  return (
                    <div
                      className="training-card"
                      key={training.id}
                    >
                      <span className="training-status">
                        ASSIGNED
                      </span>

                      <h3>{training.module_name}</h3>

                      <p>
                        Employee:{" "}
                        {employee?.name || "Employee"}
                      </p>

                      <button
                        className="primary-button"
                        onClick={() =>
                          startTraining(training)
                        }
                      >
                        TAKE TRAINING →
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        {selectedTraining && (
          <section className="panel quiz-panel" id="training-quiz">
            <div className="section-title">
              <div>
                <p className="eyebrow">
                  INTERACTIVE MICRO-TRAINING
                </p>

                <h2>{selectedTraining.module_name}</h2>
              </div>
            </div>

            {!trainingDone && score === null && (
              <>
                {quizQuestions.map((question, index) => (
                  <div className="question" key={index}>
                    <h3>
                      {index + 1}. {question.question}
                    </h3>

                    {question.options.map(
                      (option, optionIndex) => (
                        <label
                          className="option"
                          key={optionIndex}
                        >
                          <input
                            type="radio"
                            name={`question-${index}`}
                            checked={
                              answers[index] === optionIndex
                            }
                            onChange={() =>
                              setAnswers({
                                ...answers,
                                [index]: optionIndex,
                              })
                            }
                          />

                          {option}
                        </label>
                      )
                    )}
                  </div>
                ))}

                <button
                  className="primary-button"
                  onClick={submitQuiz}
                >
                  SUBMIT TRAINING QUIZ
                </button>
              </>
            )}

            {score !== null && !trainingDone && (
              <div className="result-box">
                <p>Your Training Score</p>

                <strong>{score}%</strong>

                <p>
                  {score >= 70
                    ? "Training passed. You can complete remediation."
                    : "Review the module and improve your score."}
                </p>

                {score >= 70 ? (
                  <button
                    className="primary-button"
                    onClick={completeTraining}
                  >
                    COMPLETE REMEDIATION ✓
                  </button>
                ) : (
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setScore(null);
                      setAnswers({});
                    }}
                  >
                    RETAKE QUIZ
                  </button>
                )}
              </div>
            )}

            {trainingDone && (
              <div className="success-box">
                <div className="success-icon">✓</div>

                <h2>Remediation Completed</h2>

                <p>
                  The employee has successfully completed
                  the security training.
                </p>

                <strong>
                  STATUS UPDATED → ACTIVE
                </strong>
              </div>
            )}
          </section>
        )}

        <section className="architecture">
          <div>
            <span>FRONTEND</span>
            <strong>React</strong>
          </div>

          <div className="arrow">→</div>

          <div>
            <span>API</span>
            <strong>FastAPI</strong>
          </div>

          <div className="arrow">→</div>

          <div>
            <span>DATABASE</span>
            <strong>Supabase</strong>
          </div>

          <div className="arrow">→</div>

          <div>
            <span>TELEMETRY</span>
            <strong>Events</strong>
          </div>
        </section>
      </main>

      <footer>
        CyberShield • Adaptive Behavioral Threat Training •
        Safe Simulation Environment
      </footer>
    </div>
  );
}

export default App;