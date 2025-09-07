# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **sphr** (Simple Personal Healthcare Records) project - a documentation-based repository for a healthcare records management system. The project is currently in the requirements definition and planning phase, following IPA (独立行政法人情報処理推進機構) requirements definition processes.

## Project Structure

The repository is primarily documentation-focused with the following structure:

- `docs/requirements/` - Requirements definition documents (RDDD series)
- `docs/process/` - Process definition documents
  - `RD/` - Business requirement definition documents (RDBR series)
- `docs/minutes/` - Meeting minutes and RFP documentation
- `logs/` - Project logs directory

## System Requirements (from RFP)

The target system is a personal healthcare record management application with these key features:

### Core Functionality
- **Data Registration**: Daily input via smartphone/web (entry, modification, deletion, reference)
- **Data Accumulation**: Time-series data storage
- **Data Output**: 
  - Statistical analysis (max/min/average) with date range specification
  - Graphical visualization (line charts, 30-day moving averages)
- **Authentication**: Basic authentication
- **Data Migration**: Support for 3 years of historical data

### Health Data Types (configurable via master data)
- Blood pressure (systolic/diastolic)
- Pulse rate
- Body weight
- Other customizable health metrics

### Technical Context
- Addresses gaps in existing solutions:
  - EPARK: Over-featured, not customizable
  - Smartwatches: Limited data types (can't handle weight, etc.)
- Target users: Individuals wanting to share health data with their primary care physicians

## Development Guidelines

### Requirements Definition Process
This project follows IPA-based requirements definition with these mandatory levels:
- **Level 1 & 2 processes**: Must be implemented
- **Level 3 processes**: Can be appropriately consolidated

### Documentation Standards
- Follow the DD (Documents Description) series numbering system
- Business concepts must include PEST analysis, SWOT analysis, Balanced Scorecard, and Business Model Canvas
- All stakeholders and requirements must be systematically documented and tracked

### Current Development Status
The repository currently contains only planning and requirements documentation. No source code, build scripts, or deployment configurations are present yet. When development begins, typical web application structure with mobile support will likely be needed based on the requirements.

## Important Notes

This is a healthcare data management system, so when development begins:
- Follow healthcare data privacy regulations
- Implement proper security measures for personal health information
- Ensure compliance with medical information handling guidelines
- Consider accessibility requirements for healthcare applications