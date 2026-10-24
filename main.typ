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
- Organized the \$50,000 2024 LEAP ClimSim Kaggle Competition and submitted a paper investigating how the winning deep learning architectures performed when integrated in a climate model.

#work(
  title: "Data & Analytics Services (DAS) Intern",
  location: "Berkeley, CA",
  company: "Vayuh.ai and Lawrence Berkeley National Laboratory",
  dates: dates-helper(start-date: "May 2024", end-date: "Sep 2024"),
)
- Created a machine learning pipeline for predicting wind power output using real-time HRRR forecasts.

== Selected Papers
- Crowdsourcing the Frontier: Advancing Hybrid Physics-ML Climate Simulation via a \$50,000 Kaggle Competition (1st author, in review at JAMES)
- Data-Driven Integration Kernels for Interpretable Nonlocal Operator Learning (2nd author, accepted in Climate Informatics)
- Navigating the Noise: Bringing Clarity to ML Parameterization Design with O(100) Ensembles (1st author, published in JAMES)
- Stable Machine-Learning Parameterization of Subgrid Processes in a Comprehensive Atmospheric Model Learned From Embedded Convection-Permitting Simulations (4th author, published in JAMES)
- ClimSim-Online: A Large Multi-scale Dataset and Framework for Hybrid ML-physics Climate Emulation (6th author, published in Journal of Machine Learning Research)
- ClimSim: A large multi-scale dataset for hybrid physics-ML climate emulation (4th author, Best Paper in 2023 NeurIPS Datasets and Benchmarks Track)
- Stress-testing the coupled behavior of hybrid physics-machine learning climate simulations on an unseen, warmer climate (1st author, accepted in 2023 NeurIPS Climate Change AI Workshop)
- Climate-invariant Machine Learning (6th author, accepted in Science Advances)

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
