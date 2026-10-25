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

== Selected Papers
- Run It Back: Autoregression vs. Video Diffusion for End-Conditioned Weather Trajectories (1st author; accepted, NeurIPS 2026 Climate Change AI Workshop)
- Signoff: Bringing Human Accountability Back to Agent-Powered Research (1st author; accepted, BayLearn 2026; peer reviewed)
- #link("https://arxiv.org/abs/2608.19008")[Extremes on Rewind: Generating 1,000-Member Ensembles Initialized at a Final Condition] (1st author; preprint, under review, 2026)
- #link("https://doi.org/10.1029/2025MS005643")[Crowdsourcing the Frontier: Advancing Hybrid Physics-ML Climate Simulation via a \$50,000 Kaggle Competition] (1st author; published in JAMES, 2026)
- #link("https://doi.org/10.1017/eds.2026.10056")[Data-driven integration kernels for interpretable nonlocal operator learning] (2nd author; published in Environmental Data Science, 2026)
- #link("https://doi.org/10.1029/2024MS004551")[Navigating the Noise: Bringing Clarity to ML Parameterization Design with O(100) Ensembles] (1st author, published in JAMES)
- #link("https://doi.org/10.1029/2024MS004618")[Stable Machine-Learning Parameterization of Subgrid Processes in a Comprehensive Atmospheric Model Learned From Embedded Convection-Permitting Simulations] (4th author, published in JAMES)
- #link("https://jmlr.org/papers/v26/24-1014.html")[ClimSim-Online: A Large Multi-scale Dataset and Framework for Hybrid ML-physics Climate Emulation] (6th author, published in Journal of Machine Learning Research)
- #link("https://openreview.net/pdf?id=W5If9P1xqO")[ClimSim: A large multi-scale dataset for hybrid physics-ML climate emulation] (4th author, Best Paper in 2023 NeurIPS Datasets and Benchmarks Track)
- #link("https://doi.org/10.1126/sciadv.adj7250")[Climate-invariant Machine Learning] (6th author, published in Science Advances)
- #link("https://www.climatechange.ai/papers/neurips2023/62")[Stress-testing the coupled behavior of hybrid physics-machine learning climate simulations on an unseen, warmer climate] (1st author, accepted in 2023 NeurIPS Climate Change AI Workshop)

== Research & Applied ML Experience

#work(
  title: "Postdoctoral Research Associate",
  location: "Boston, MA",
  company: "Boston University Faculty of Computing and Data Science (CDS)",
  dates: dates-helper(start-date: "Sep 2025", end-date: "Present"),
)
- Research in the Barnes Group on AI weather emulators for extreme-event scenario planning.

#work(
  title: "Graduate Research Assistant",
  location: "Irvine, CA",
  company: "UC Irvine Earth System Science",
  dates: dates-helper(start-date: "Sep 2020", end-date: "Jul 2025"),
)
- Built a pipeline to train and evaluate hundreds of hybrid physics-ML climate models at a time.
- Core contributor (4th author) to ClimSim, which won the best paper award in the 2023 NeurIPS Datasets and Benchmarks Track.
- Organized the \$50,000 2024 LEAP ClimSim Kaggle competition and evaluated winning architectures in a climate model.

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
- Python, PyTorch, Jax, Git, Bash.
- Conceived of and organized the inaugural #link("https://leap-stc.github.io/ml4esm-workshop/")[Machine Learning for Earth System Modeling (ML4ESM) Workshop] at ICML 2024.
