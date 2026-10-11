from daimon.tokens import count


def test_tokens():
    assert count("abcd" * 10) == 10
    assert count("") == 0
    assert count("abcde") == 2
