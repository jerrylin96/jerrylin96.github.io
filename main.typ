#import "resume/template.typ": resume, dates-helper, work, edu, extracurriculars

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

== Tech Stack
- Python, PyTorch, Jax, Git, Bash

== Work Experience

#work(
  title: "Postdoctoral Research Associate",
  location: "Boston, MA",
  company: "Boston University Faculty of Computing and Data Science (CDS)",
  dates: dates-helper(start-date: "Sep 2025", end-date: "Present"),
)
- Working in the Barnes Group on improving understanding of how AI-weather emulators can be used for scenario planning and simulation of extreme events.

#work(
  title: "Graduate Research Assistant",
  location: "Irvine, CA",
  company: "UC Irvine Earth System Science",
  dates: dates-helper(start-date: "Sep 2020", end-date: "Jul 2025"),
)
- Created an end-to-end pipeline for training and testing hundreds of hybrid physics-AI climate models at a time.
- Core contributor (4th author) to ClimSim, which won the best paper award in the 2023 NeurIPS Datasets and Benchmarks Track.
- Organized the \$50,000 2024 LEAP ClimSim Kaggle Competition and published a paper investigating how the winning deep learning architectures performed when integrated in a climate model.

#work(
  title: "Data & Analytics Services (DAS) Intern",
  location: "Berkeley, CA",
  company: "Vayuh.ai and Lawrence Berkeley National Laboratory",
  dates: dates-helper(start-date: "May 2024", end-date: "Sep 2024"),
)
- Created a machine learning pipeline for predicting wind power output using real-time HRRR forecasts.

== Selected Papers
- Run It Back: Autoregression vs. Video Diffusion for End-Conditioned Weather Trajectories (1st author; accepted, NeurIPS 2026 Climate Change AI Workshop)
- Signoff: Bringing Human Accountability Back to Agent-Powered Research (1st author; accepted, BayLearn 2026; peer reviewed)
- #link("https://arxiv.org/abs/2608.19008")[Extremes on Rewind: Generating 1,000-Member Ensembles Initialized at a Final Condition] (1st author; preprint, under review, 2026)
- #link("https://doi.org/10.1029/2025MS005643")[Crowdsourcing the Frontier: Advancing Hybrid Physics-ML Climate Simulation via a \$50,000 Kaggle Competition] (1st author; published in JAMES, 2026)
- #link("https://doi.org/10.1017/eds.2026.10056")[Data-driven integration kernels for interpretable nonlocal operator learning] (2nd author; published in Environmental Data Science, 2026)
- Navigating the Noise: Bringing Clarity to ML Parameterization Design with O(100) Ensembles (1st author, published in JAMES)
- ClimSim: A large multi-scale dataset for hybrid physics-ML climate emulation (4th author, Best Paper in 2023 NeurIPS Datasets and Benchmarks Track)
- Stress-testing the coupled behavior of hybrid physics-machine learning climate simulations on an unseen, warmer climate (1st author, accepted in 2023 NeurIPS Climate Change AI Workshop)

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

== Extracurricular Activities & Awards

#extracurriculars(
  activity: "2024 ML4ESM ICML Workshop organizer",
)
- Conceived of and organized the first Machine Learning for Earth System Modeling (ML4ESM) Workshop at ICML.
- https://leap-stc.github.io/ml4esm-workshop/

#extracurriculars(
  activity: "2023 Excellence in Leadership Award (UC Irvine Earth System Science Department)",
)
