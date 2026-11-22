#import "resume/template.typ": resume, dates-helper, work, edu

#let name = "Jerry Lin"
#let email = "jlin404@bu.edu"
#let github = "github.com/jerrylin96"
#let linkedin = "linkedin.com/in/jerry-lin-3a8801104"
#let personal-site = "jlin404.com"

#show: resume.with(
  author: name,
  personal-site: personal-site,
  email: email,
  github: github,
  linkedin: linkedin,
)

#v(3pt)
ML researcher (PhD, now a postdoc) who has led large collaborations, including a \$50,000 Kaggle competition with about 700 teams and an ICML workshop, and built training and evaluation infrastructure spanning thousands of models. Recent work includes tooling for human oversight of AI coding agents.

== Selected Papers
- Signoff: Bringing Human Accountability Back to Agent-Powered Research (1st author; accepted, #link("https://baylearn.org/submissions.html")[BayLearn 2026], peer reviewed; #link("https://github.com/jerrylin96/git-signoff")[open-source tool]) \
  _AI oversight: an agent interviews the human behind an AI-assisted change and records demonstrated understanding as a signed, verifiable attestation in git history, so human review is checked, not assumed._
- #link("https://arxiv.org/abs/2611.21521")[Run it Back: Autoregression vs. Video Diffusion for Final-Conditioned Weather Trajectories] (1st author; accepted, NeurIPS 2026 Climate Change AI Workshop)
- #link("https://arxiv.org/abs/2608.19008")[Extremes on Rewind: Generating 1,000-Member Ensembles Initialized at a Final Condition] (1st author; preprint, under review)
- #link("https://doi.org/10.1029/2025MS005643")[Crowdsourcing the Frontier: Advancing Hybrid Physics-ML Climate Simulation via a \$50,000 Kaggle Competition] (1st author; JAMES, 2026)
- #link("https://doi.org/10.1017/eds.2026.10056")[Data-driven integration kernels for interpretable nonlocal operator learning] (2nd author; Environmental Data Science, 2026)
- #link("https://doi.org/10.1029/2024MS004551")[Navigating the Noise: Bringing Clarity to ML Parameterization Design with O(100) Ensembles] (1st author; JAMES)
- #link("https://doi.org/10.1029/2024MS004618")[Stable Machine-Learning Parameterization of Subgrid Processes in a Comprehensive Atmospheric Model Learned From Embedded Convection-Permitting Simulations] (4th author; JAMES)
- #link("https://jmlr.org/papers/v26/24-1014.html")[ClimSim-Online: A Large Multi-scale Dataset and Framework for Hybrid ML-physics Climate Emulation] (6th author; JMLR)
- #link("https://proceedings.neurips.cc/paper/2023/hash/45fbcc01349292f5e059a0b8b02c8c3f-Abstract-Datasets_and_Benchmarks.html")[ClimSim: A large multi-scale dataset for hybrid physics-ML climate emulation] (4th author; Best Paper, NeurIPS 2023 Datasets and Benchmarks Track)
- #link("https://doi.org/10.1126/sciadv.adj7250")[Climate-invariant Machine Learning] (6th author; Science Advances)
- #link("https://www.climatechange.ai/papers/neurips2023/62")[Stress-testing the coupled behavior of hybrid physics-machine learning climate simulations on an unseen, warmer climate] (1st author; NeurIPS 2023 Climate Change AI Workshop)

== Research & Applied ML Experience

#work(
  title: "Postdoctoral Research Associate",
  location: "Boston, MA",
  company: "Boston University Faculty of Computing and Data Science (CDS)",
  dates: dates-helper(start-date: "Sep 2025", end-date: "Present"),
)
- Barnes Group: generative AI weather emulators that sample the many ways a rare extreme event could unfold.
- Built and trained Rewind-AR, a 273.5M-parameter probabilistic backward-in-time emulator (PyTorch, fork of NVIDIA Makani), with its ERA5 data pipeline, hardened training loop, and ensemble evaluation harness (_Run it Back_).
- Generated 1,000-member ensembles for three historical extremes with an off-the-shelf video diffusion model and showed where they are underdispersed and physically inconsistent (_Extremes on Rewind_, _Run it Back_).

#work(
  title: "Graduate Research Assistant",
  location: "Irvine, CA",
  company: "UC Irvine Earth System Science",
  dates: dates-helper(start-date: "Sep 2020", end-date: "Jul 2025"),
)
- Built ClimScale, a semi-automated pipeline (KerasTuner, Fortran-Keras Bridge, HPC GPUs) that trained 2,970 neural networks, 330 per design choice, and tested each one coupled to a climate model (_Navigating the Noise_).
- Core contributor (4th author) to ClimSim, which won the best paper award in the 2023 NeurIPS Datasets and Benchmarks Track.
- Organized the \$50,000 2024 LEAP ClimSim Kaggle competition (about 700 teams, 10,000+ submissions), then led the follow-up study testing winning architectures in a climate model (8,320 A100 GPU-hours).

#work(
  title: "Data & Analytics Services (DAS) Intern",
  location: "Berkeley, CA",
  company: "Vayuh.ai and Lawrence Berkeley National Laboratory",
  dates: "2024",
)
- Created a machine learning pipeline for predicting wind power output using real-time HRRR forecasts.

== Education

#edu(
  institution: "University of California, Irvine",
  location: "Irvine, CA",
  dates: dates-helper(start-date: "Sep 2020", end-date: "Jul 2025"),
  degree: "PhD, Earth System Science",
)

#edu(
  institution: "University of California, Berkeley",
  location: "Berkeley, CA",
  dates: dates-helper(start-date: "Aug 2014", end-date: "Dec 2018"),
  degree: "BA, Applied Mathematics",
)

== Skills & Leadership
- Python, PyTorch (multi-GPU DDP training), Keras/KerasTuner, HPC GPU clusters (NERSC Perlmutter, Bridges-2), Apptainer, Git, GitHub Actions CI, pytest, Bash; agentic coding with Claude Code and Codex.
- Conceived and organized the first #link("https://leap-stc.github.io/ml4esm-workshop/")[Machine Learning for Earth System Modeling (ML4ESM) Workshop] at ICML 2024 (20 papers).
