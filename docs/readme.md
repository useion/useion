# Name

useion - a tool for inter-language USE case driven modularizatION

# Synopsis

useion [OPTION]... PATH...

# Description

Synchronize all the code blocks (and tests) related to a use case, which are gathered along with a use case text in a Markdown file, with the existing code at file system level. Calculate a use case step coverage of how much of use case specification is covered by code blocks (percent of words from the use case texts, which are found in code blocks).

Supported languages in this version are {%=o.supported_languages%}.

  -s, --synchronize         synchronize code blocks in PATH at start

  -w, --watch
      watch PATH for changes, synchronize and print them, and print use case coverage of the affected use cases

  -c, --use-case-coverage   calculate and print use case step coverage of all use cases in PATH and exit (see also -s)

  -S, --server=PORT
      start web app at address <http://localhost:PORT/>, show a use case and the code blocks for the use case side by side, draw lines between them to indicate which steps of the use case are covered by which lines of the code blocks

  -i, --ignore=FILE
      with  -w, -c, -s: ignore words contained in FILE (one word per line) when calculating use case step coverage

  -p, --puml                generate and print PlantUML use case diagram and exit

  -g, --git=GIT_URL         assign code changes in commits to code blocks in use case modules, and calculate how much are the code changes applied within the use case modules

  --help                    print this help and exit

  --version                 print version information and exit

# Author

Written by Michal Bystricky.

# Copyright

Copyright © 2014 Free Software Foundation, Inc.  License GPLv3+: GNU GPL  version 3 or later <http://gnu.org/licenses/gpl.html>.
This  is  free software: you are free to change and redistribute it.  There is NO WARRANTY, to the extent permitted by law.

# See also

The full documentation for useion is available at <http://useion.com/>.
