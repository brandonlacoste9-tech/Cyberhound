# Fabricator - Niche Instance Generator

The Fabricator script clones Cyberhound into niche-specific instances.

## Features

- Clone repository for different niches
- Pre-configured niche settings
- Customized README and documentation
- Automatic configuration file generation
- Support for multiple niches (tech, gaming, learning, shopping)

## Usage

### List available niches

```bash
python fabricator.py list
```

### Create a niche instance

```bash
python fabricator.py <niche> <target-directory>
```

## Examples

### Create TechHound
```bash
python fabricator.py tech ../TechHound
```

### Create GameHound
```bash
python fabricator.py gaming ../GameHound
```

### Create LearnHound
```bash
python fabricator.py learning ../LearnHound
```

### Create ShopHound
```bash
python fabricator.py shopping ../ShopHound
```

## Available Niches

- **tech** - Technology and software deals
- **gaming** - Gaming deals and bundles
- **learning** - Online course and education deals
- **shopping** - E-commerce and retail deals

## What Gets Created

Each niche instance includes:

1. Complete copy of all modules (Nose, Brain, Proxy, Face)
2. Custom `README.md` with niche-specific information
3. `config.json` with niche configuration
4. `.env.example` with environment variables template
5. Pre-configured target sites and keywords

## Customization

Edit the `niches` dictionary in `fabricator.py` to add new niches or modify existing ones:

```python
'custom': {
    'name': 'CustomHound',
    'description': 'Custom niche description',
    'keywords': ['keyword1', 'keyword2'],
    'sites': ['site1.com', 'site2.com'],
    'colors': {
        'primary': '#00d9ff',
        'secondary': '#9d00ff'
    }
}
```
