import os
from setuptools import setup, find_packages

# Read long description from README
with open(os.path.join(os.path.dirname(__file__), "README.md"), encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="agenttrace-py",
    version="0.1.0",
    description="Deterministic execution and replay layer for AI Agents",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="AgentTrace",
    author_email="hello@agenttrace.com",
    url="https://agenttrace.com",
    packages=find_packages(),
    install_requires=[
        "requests>=2.20.0",
        "typing-extensions>=4.0.0"
    ],
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
)
