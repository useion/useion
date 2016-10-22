class LazyRules:
    rules_filename = 'plural6-rules.txt'

    def __init__(self):
        self.pattern_file = open(self.rules_filename, encoding='utf-8')
        self.cache = []

    def __iter__(self):
        self.cache_index = 0
        return self

    def __next__(self):
        self.cache_index += 1
        if len(self.cache) >= self.cache_index:
            return self.cache[self.cache_index - 1]

        if self.pattern_file.closed:
            raise StopIteration

        line = self.pattern_file.readline()
        if not line:
            self.pattern_file.close()
            raise StopIteration

        pattern, search, replace = line.split(None, 3)
        funcs = build_match_and_apply_functions(
            pattern, search, replace)
        self.cache.append(funcs)
        return funcs

rules = LazyRules()


class Customer(object):
    """A customer of ABC Bank with a checking account. Customers have the
    following properties:

    Attributes:
        name: A string representing the customer's name.
        balance: A float tracking the current balance of the customer's account.
    """

    def __init__(self, name):
        """Return a Customer object whose name is *name*.""" 
        self.name = name

    def set_balance(self, balance=0.0):
        """Set the customer's starting balance."""
        self.balance = balance

    def withdraw(self, amount):
        """Return the balance remaining after withdrawing *amount*
        dollars."""
        if amount > self.balance:
            raise RuntimeError('Amount greater than available balance.')
        self.balance -= amount
        return self.balance

    def deposit(self, amount):
        """Return the balance remaining after depositing *amount*
        dollars."""
        self.balance += amount
        return self.balance


class MyClass1(object):
    def __init__(self):
        self.raw_data = None

    def _parse_data(self):
        # This is a fairly complex function xml/json parser
        raw_data = self.raw_data
        data = raw_data  #  Much for is done to do something with raw_data
        cache.set('cache_key', data, 600)  # Cache for 10 minutes
        return data

    def _populate_data(self):
        # This function grabs data from an external source
        self.raw_data = 'some raw data, xml, json or alike..'

    def get_parsed_data(self):
        cached_data = cache.get('cache_key')
        if cached_data:
            return cached_data
        else:
            self._populate_data()
            return self._parse_data()

mc1 = MyClass1()
print mc1.get_parsed_data()


class MyClass2(object):
    def _parse_data(self, raw_data):
        # This is a fairly complex function xml/json parser
        data = raw_data  # After some complicated work of parsing raw_data
        cache.set('cache_key', data, 600)  # Cache for 10 minutes
        return data

    def _get_data(self):
        # This function grabs data from an external source
        return 'some raw data, xml, json or alike..'

    def get_parsed_data(self):
        cached_data = cache.get('cache_key')
        if cached_data:
            return cached_data
        else:
            return self._populate_data(self._get_data())

mc2 = MyClass2()
print mc1.get_parsed_data()